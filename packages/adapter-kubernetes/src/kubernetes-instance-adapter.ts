import { IComponent, IObjectLogger } from "@scramjet/runtime-types";
import { ExitCode, ILifeCycleAdapterMain, ILifeCycleAdapterRun, InstanceConfig, InstanceLimits, MonitoringMessageData, RunnerConnectInfo, SequenceInfo } from "@scramjet/runtime-types";
import { K8SAdapterConfiguration, STHConfiguration } from "@scramjet/api-types";

import { ObjLogger } from "@scramjet/obj-logger";
import { createWriteStream, readFileSync } from "fs";
import path, { join } from "path";
import { KubernetesClientAdapter } from "./kubernetes-client-adapter";
import { adapterConfigDecoder } from "./kubernetes-config-decoder";
import { getRunnerEnvEntries, getRunnerTransportEnv } from "@scramjet/adapters-common";
import { PassThrough } from "stream";
import { RunnerExitCode } from "@scramjet/symbols";
import { SequenceAdapterError } from "@scramjet/model";
import { mkdir, stat, unlink } from "fs/promises";
import { COMPRESSED_DIR } from "./constants";
import { c } from "tar";
import { load as loadYaml } from "js-yaml";
import { isIPv4 } from "net";
import { hostname, networkInterfaces } from "os";
import { defer } from "@scramjet/utility";
import { selectRunnerImageForEngines } from "@scramjet/adapters-common";

/**
 * Adapter for running Instance by Runner executed in separate process.
 */
class KubernetesInstanceAdapter implements
    ILifeCycleAdapterMain,
    ILifeCycleAdapterRun,
    IComponent {
    logger: IObjectLogger;
    name = "KubernetesInstanceAdapter";

    private sthConfig: STHConfiguration;
    private _runnerName?: string;
    private _kubeClient?: KubernetesClientAdapter;
    private sthHost: string;

    private adapterConfig: K8SAdapterConfiguration;
    private _limits?: InstanceLimits = {};

    stdErrorStream?: PassThrough;
    sequenceWorkdir: string;

    get limits() { return this._limits || {} as InstanceLimits; }
    private set limits(value: InstanceLimits) { this._limits = value; }

    constructor(sthConfig: STHConfiguration) {
        // @TODO this is a redundant check (it was already checked in sequence adapter)
        // We should move this to config service decoding: https://github.com/scramjetorg/transform-hub/issues/279
        this.sthConfig = sthConfig;
        this.logger = new ObjLogger(this);

        const decodedAdapterConfig = adapterConfigDecoder.decode(sthConfig.adapters.kubernetes);

        if (!decodedAdapterConfig.isOk()) {
            throw new Error("Invalid Kubernetes Adapter configuration");
        }

        this.adapterConfig = decodedAdapterConfig.value;

        this.sequenceWorkdir = join(this.adapterConfig.sequencesRoot, COMPRESSED_DIR);

        this.sthHost = this.adapterConfig.sthPodHost === ":auto" ? this.obtainHost() : this.adapterConfig.sthPodHost;
    }

    private obtainHost(): string {
        const authConfig = this.adapterConfig.authConfigPath;

        if (!authConfig) {
            throw new Error("Cannot determine host. No auth config path provided.");
        }

        const yaml: any = loadYaml(readFileSync(authConfig, "utf8"));
        const hostFromYaml = yaml?.clusters?.[0]?.cluster?.server;

        if (!hostFromYaml) {
            throw new Error("Cannot determine host. No host found in auth config.");
        }

        const url = new URL(hostFromYaml);
        const host = url.hostname;

        if (host === "localhost") return "localhost";

        if (isIPv4(host)) {
            const interfaces = networkInterfaces();
            const hostParts = host.split(".").map((_, i, all) => all.slice(0, i + 1).join("."));

            const bestInterface = Object.values(interfaces).flatMap((addresses) => {
                if (!addresses) return [];

                return addresses.filter((address) => {
                    return address.family === "IPv4";
                }).map((address) => {
                    return {
                        score: hostParts.findIndex((part) => address.address.startsWith(part)),
                        address: address.address,
                        internal: address.internal
                    };
                });
            }).sort((a, b) => b.score - a.score)[0];

            if (bestInterface) {
                return bestInterface.address;
            }
        }

        this.logger.warn("Cannot determine IP address, using hostname instead.");
        return hostname();
    }

    private get kubeClient() {
        if (!this._kubeClient) {
            this._kubeClient = new KubernetesClientAdapter(this.adapterConfig.authConfigPath, this.adapterConfig.namespace);
            this._kubeClient.init();
        }

        return this._kubeClient;
    }

    async init(): Promise<void> {
        const sequenceWorkdir = await stat(this.sequenceWorkdir).catch(() => mkdir(this.sequenceWorkdir));

        if (sequenceWorkdir && !sequenceWorkdir.isDirectory()) {
            throw new SequenceAdapterError("CONFIGURATION_ERROR", `Kubernetes sequence workdir exists and is not a directory: ${this.sequenceWorkdir}`);
        }

        this.kubeClient.logger.pipe(this.logger);
    }

    async stats(msg: MonitoringMessageData): Promise<MonitoringMessageData> {
        return {
            // @TODO: provide limits and stats
            ...msg,
        };
    }

    private get runnerResourcesConfig() {
        return {
            requests: {
                memory: this.limits?.memory ? this.limits?.memory + "M" : this.adapterConfig.runnerResourcesRequestsMemory || "128M",
                cpu: this.adapterConfig.runnerResourcesRequestsCpu || "250m"
            },
            limits: {
                memory: this.limits?.memory ? this.limits?.memory * 2 + "M" : this.adapterConfig.runnerResourcesLimitsMemory || "1G",
                cpu: this.adapterConfig.runnerResourcesLimitsCpu || "1000m"
            }
        };
    }

    async dispatch(config: InstanceConfig, instancesServerPort: number, instanceId: string, sequenceInfo: SequenceInfo, payload: RunnerConnectInfo): Promise<number> {
        if (config.type !== "kubernetes") {
            throw new Error(`Invalid config type for kubernetes adapter: ${config.type}`);
        }

        if (this.adapterConfig.quotaName && await this.kubeClient.isPodsLimitReached(this.adapterConfig.quotaName)) {
            return RunnerExitCode.PODS_LIMIT_REACHED;
        }

        this.limits = config.limits;

        this._runnerName = `runner-${instanceId}`;
        const runnerName = this._runnerName;

        this.logger.debug("Creating Runner Pod");

        const writeDegraded = "writeDegraded" in payload ? payload.writeDegraded : true;

        const env =
            getRunnerEnvEntries({
                sequencePath: path.join("/package", config.entrypointPath),
                instancesServerPort,
                instancesServerHost: this.sthHost,
                instanceId,
                pipesPath: "",
                sequenceInfo,
                payload: { writeDegraded, ...payload }
            }, {
                ...this.sthConfig.runnerEnvs,
                ...getRunnerTransportEnv(this.sthConfig, instanceId)
            }).map(([name, value]) => ({ name, value }));

        const runnerImage = selectRunnerImageForEngines(config.engines, this.adapterConfig.runnerImages);

        const tagLabels = Object.fromEntries((sequenceInfo.config?.tags || []).map((tag: string) => [`tag.${tag}`, "true"]));

        const labels = {
            app: "runner",
            sequence: sequenceInfo.id,
            ...tagLabels
        };

        this.logger.debug("Runner Pod labels", labels, sequenceInfo.config);

        await this.kubeClient.createPod(
            {
                name: runnerName,
                labels
            },
            {
                containers: [{
                    env: [...env,
                        {
                            name: "EXPOSE_HOST",
                            valueFrom: { fieldRef: { fieldPath: "status.podIP" } }
                        }
                    ],
                    name: runnerName,
                    image: runnerImage,
                    stdin: true,
                    readinessProbe: writeDegraded ? {
                        exec: {
                            command: ["test", "!", "-e", "/tmp/degraded"]
                        },
                        initialDelaySeconds: 5,
                        periodSeconds: 10,
                        timeoutSeconds: 1
                    } : undefined,
                    command: ["wait-for-sequence-and-start.sh"],
                    imagePullPolicy: "IfNotPresent",
                    resources: this.runnerResourcesConfig
                }],
                restartPolicy: "Never",
            },
            2
        );

        this.logger.debug("Runner Pod created");

        const startPodStatus = await this.kubeClient.waitForPodStatus(runnerName, ["Running", "Failed"]);

        this.logger.debug("Runner Pod status");

        if (startPodStatus.status === "Failed") {
            this.logger.error("Runner unable to start", startPodStatus);

            await this.remove(this.adapterConfig.timeout);

            // This means runner pod was unable to start. So it went from "Pending" to "Failed" state directly.
            // Return 1 which is Linux exit code for "General Error" since we are not able
            // to determine what happened exactly.
            return RunnerExitCode.UNCAUGHT_EXCEPTION;
        }

        this.logger.debug("Copy sequence files to Runner");

        const compressedSequence = path.join(this.sequenceWorkdir, `${ config.id }.tar.gz`);

        this.logger.info("Sequence not found, creating compressed stream from sequence dir");

        const compressedProcess = c({ z: true, C: path.join(this.adapterConfig.sequencesRoot, config.id) }, ["."]);
        const compressedStream = compressedProcess.pipe(new PassThrough());
        const fileStream = compressedProcess.pipe(new PassThrough());

        compressedProcess.on("error", (e) => compressedStream.emit("error", e));
        fileStream.pipe(createWriteStream(compressedSequence))
            .on("error", async (e) => {
                this.logger.warn("Error creating compressed sequence", e);
                await unlink(compressedSequence).catch(() => {
                    this.logger.error("Error deleting compressed sequence", e);
                });
            })
            .on("finish", () => {
                this.logger.debug("Compressed sequence created");
            });

        await new Promise((resolve, reject) => {
            compressedStream.on("error", (e) => {
                this.logger.error("Error creating compressed sequence", e);
                reject(e);
            });
            compressedStream.on("end", () => {
                this.logger.debug("Compressed sequence stream ended");
            });

            const stdErrorStream = new PassThrough();

            stdErrorStream.on("data", (data) => { this.logger.error("POD stderr", data.toString()); });

            this.kubeClient
                .exec(
                    runnerName,
                    runnerName,
                    ["unpack.sh", "/package"],
                    process.stdout,
                    stdErrorStream,
                    compressedStream,
                    0
                )
                .then(resolve, reject);
        });

        this.logger.debug("Copy command done");

        return 0;
    }

    async waitUntilExit(_config: InstanceConfig, instanceId: string, _sequenceInfo: SequenceInfo): Promise<ExitCode> {
        this.logger.info("Waiting for pod exit...");

        this._runnerName ||= `runner-${instanceId}`;

        const exitPodStatus = await this.kubeClient.waitForPodStatus(this._runnerName!, ["Succeeded", "Failed", "Unknown"]);

        if (exitPodStatus.status !== "Succeeded") {
            this.logger.error("Runner stopped incorrectly", exitPodStatus);

            await defer(200);

            // Capture crash log before removing the pod
            const crashLog = await this.getCrashLog();

            this.logger.error("Runner crash log", crashLog);

            await this.remove(this.adapterConfig.timeout);

            return exitPodStatus.code || 137;
        }

        this.logger.info("Runner stopped without issues");

        await this.remove(this.adapterConfig.timeout);

        return 0;
    }

    async run(config: InstanceConfig, instancesServerPort: number, instanceId: string, sequenceInfo: SequenceInfo, payload: RunnerConnectInfo): Promise<ExitCode> {
        await this.dispatch(config, instancesServerPort, instanceId, sequenceInfo, payload);
        return this.waitUntilExit(config, instanceId, sequenceInfo);
    }

    async cleanup(): Promise<void> {
        await this.remove(this.adapterConfig.timeout);
    }

    // @ts-expect-error
    monitorRate(_rps: number): this {
        /** ignore */
    }

    // Forcefully stops Runner process.
    async remove(ms: number = 0) {
        if (!this._runnerName) {
            this.logger.error("Trying to stop non existent runner", this._runnerName);
        } else {
            if (ms) await defer(ms);
            await this.kubeClient.deletePod(this._runnerName, 2)
                .catch((e) => {
                    this.logger.error("Error deleting pod", e, this._runnerName);
                });

            this._runnerName = undefined;
        }
    }

    async getCrashLog(): Promise<string[]> {
        if (this._kubeClient && this._runnerName) {
            return this._kubeClient.getPodLog(this._runnerName);
        }

        return ["Crashlog cannot be fetched"];
    }
}

export { KubernetesInstanceAdapter };

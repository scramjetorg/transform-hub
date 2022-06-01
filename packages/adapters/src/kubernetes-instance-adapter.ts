/* eslint-disable no-console */
import {
    ExitCode,
    IComponent,
    ILifeCycleAdapterMain,
    ILifeCycleAdapterRun,
    IObjectLogger,
    K8SAdapterConfiguration,
    MonitoringMessageData,
    SequenceConfig,
    STHConfiguration,
} from "@scramjet/types";

import path from "path";
import { ObjLogger } from "@scramjet/obj-logger";
import { createReadStream } from "fs";
import { KubernetesClientAdapter } from "./kubernetes-client-adapter";
import { adapterConfigDecoder } from "./kubernetes-config-decoder";
import { getRunnerEnvEntries } from "./get-runner-env";
import { PassThrough } from "stream";

/**
 * Adapter for running Instance by Runner executed in separate process.
 */
class KubernetesInstanceAdapter implements
ILifeCycleAdapterMain,
ILifeCycleAdapterRun,
IComponent {
    logger: IObjectLogger;
    name = "KubernetesInstanceAdapter"

    private _runnerName?: string
    private _kubeClient?: KubernetesClientAdapter;

    private adapterConfig: K8SAdapterConfiguration

    constructor(sthConfig: STHConfiguration) {
        // @TODO this is a redundant check (it was already checked in sequence adapter)
        // We should move this to config service decoding: https://github.com/scramjetorg/transform-hub/issues/279
        const decodedAdapterConfig = adapterConfigDecoder.decode(sthConfig.kubernetes);

        if (!decodedAdapterConfig.isOk()) {
            throw new Error("Invalid Kubernetes Adapter configuration");
        }

        this.adapterConfig = decodedAdapterConfig.value;
        this.logger = new ObjLogger(this.name);
    }

    private get kubeClient() {
        if (!this._kubeClient) {
            throw new Error("Kubernetes client not initialized");
        }

        return this._kubeClient;
    }

    async init(): Promise<void> {
        this._kubeClient = new KubernetesClientAdapter(this.adapterConfig.authConfigPath, this.adapterConfig.namespace);
        this.kubeClient.init();

        this._kubeClient.logger.pipe(this.logger);
    }

    async stats(msg: MonitoringMessageData): Promise<MonitoringMessageData> {
        return {
            ...msg,
        };
    }

    private get runnerResourcesConfig() {
        return {
            requests: {
                memory:  this.adapterConfig.runnerResourcesRequestsMemory || "128M",
                cpu: this.adapterConfig.runnerResourcesRequestsCpu || "250m"
            },
            limits: {
                memory: this.adapterConfig.runnerResourcesLimitsMemory || "1G",
                cpu: this.adapterConfig.runnerResourcesLimitsCpu || "1000m"
            }
        };
    }

    async run(config: SequenceConfig, instancesServerPort: number, instanceId: string): Promise<ExitCode> {
        if (config.type !== "kubernetes") {
            throw new Error(`Invalid config type for kubernetes adapter: ${config.type}`);
        }

        const runnerName = this._runnerName = `runner-${ instanceId }`;

        this.logger.debug("Creating Runner Pod");

        const env =
            getRunnerEnvEntries({
                sequencePath: path.join("/package", config.entrypointPath),
                instancesServerPort,
                instancesServerHost: this.adapterConfig.sthPodHost,
                instanceId,
                pipesPath: ""
            }).map(([name, value]) => ({ name, value }));

        const runnerImage = config.engines.python3
            ? this.adapterConfig.runnerImages.python3
            : this.adapterConfig.runnerImages.node;

        await this.kubeClient.createPod(
            {
                name: runnerName,
                labels: {
                    app: "runner"
                }
            },
            {
                containers: [{
                    env,
                    name: runnerName,
                    image: runnerImage,
                    stdin: true,
                    command: ["wait-for-sequence-and-start.sh"],
                    imagePullPolicy: "Always",
                    resources: this.runnerResourcesConfig
                }],
                restartPolicy: "Never",
            },
            2
        );

        const startPodStatus = await this.kubeClient.waitForPodStatus(runnerName, ["Running", "Failed"]);

        if (startPodStatus.status === "Failed") {
            this.logger.error("Runner unable to start", startPodStatus);

            await this.remove(this.adapterConfig.timeout);

            // This means runner pod was unable to start. So it went from "Pending" to "Failed" state directly.
            // Return 1 which is Linux exit code for "General Error" since we are not able
            // to determine what happened exactly.
            return startPodStatus.code || 137;
        }

        this.logger.debug("Copy sequence files to Runner");

        const compressedStream = createReadStream(path.join(config.sequenceDir, "compressed.tar.gz"));
        const stdErrorStream = new PassThrough();

        stdErrorStream.on("data", (data) => { this.logger.error("POD stderr", data.toString()); });

        await this.kubeClient.exec(runnerName, runnerName, ["unpack.sh", "/package"], process.stdout, stdErrorStream, compressedStream, 2);

        const exitPodStatus = await this.kubeClient.waitForPodStatus(runnerName, ["Succeeded", "Failed", "Unknown"]);

        stdErrorStream.end();

        if (exitPodStatus.status !== "Succeeded") {
            this.logger.error("Runner stopped incorrectly", exitPodStatus);
            this.logger.error("Container failure reason is: ", await this.kubeClient.getPodTerminatedContainerReason(runnerName));

            await this.remove(this.adapterConfig.timeout);

            return exitPodStatus.code || 137;
        }

        this.logger.info("Runner stopped without issues");

        await this.remove(this.adapterConfig.timeout);

        // @TODO handle error status
        return 0;
    }

    async cleanup(): Promise<void> {
        //noop
    }

    // @ts-ignore
    monitorRate(_rps: number): this {
        /** ignore */
    }

    async timeout(ms: string) {
        return new Promise(resolve => setTimeout(resolve, parseInt(ms, 10)));
    }

    // Forcefully stops Runner process.
    async remove(ms: string = "0") {
        if (!this._runnerName) {
            this.logger.error("Trying to stop non existent runner", this._runnerName);
        } else {
            await this.timeout(ms);
            await this.kubeClient.deletePod(this._runnerName, 2);

            this._runnerName = undefined;
        }
    }

    async getCrashLog(): Promise<string[]> {
        return ["Crashlog not implemented"];
    }
}

export { KubernetesInstanceAdapter };

import { development, configService } from "@scramjet/sth-config";
import { getLogger } from "@scramjet/logger";
import { DelayedStream, SupervisorError } from "@scramjet/model";
import {
    DownstreamStreamsConfig,
    ExitCode,
    ICommunicationHandler,
    IComponent,
    ILifeCycleAdapterMain,
    ILifeCycleAdapterRun,
    Logger,
    MaybePromise,
    MonitoringMessageData,
    RunnerConfig
} from "@scramjet/types";
import { exec } from "child_process";
import { createReadStream, createWriteStream } from "fs";
import { chmod, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import * as path from "path";
import * as shellescape from "shell-escape";
import { PassThrough } from "stream";
import { RunnerMessageCode } from "@scramjet/symbols";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import { DockerAdapterResources, DockerAdapterRunPortsConfig, DockerAdapterVolumeConfig, IDockerHelper } from "./types";
import { FreePortsFinder } from "./utils";
import { defer } from "@scramjet/utility";

class LifecycleDockerAdapterInstance implements
ILifeCycleAdapterMain,
ILifeCycleAdapterRun,
IComponent {
    private dockerHelper: IDockerHelper;

    private monitorFifoPath?: string;
    private controlFifoPath?: string;
    private inputFifoPath?: string;
    private outputFifoPath?: string;
    private loggerFifoPath?: string;

    private runnerStdin: PassThrough;
    private runnerStdout: PassThrough;
    private runnerStderr: PassThrough;
    private monitorStream: DelayedStream;
    private controlStream: DelayedStream;
    private loggerStream: DelayedStream;
    private inputStream: DelayedStream;
    private outputStream: DelayedStream;

    private resources: DockerAdapterResources = {};

    logger: Logger;

    constructor() {
        this.dockerHelper = new DockerodeDockerHelper();

        this.runnerStdin = new PassThrough();
        this.runnerStdout = new PassThrough();
        this.runnerStderr = new PassThrough();
        this.monitorStream = new DelayedStream();
        this.controlStream = new DelayedStream();
        this.loggerStream = new DelayedStream();
        this.inputStream = new DelayedStream();
        this.outputStream = new DelayedStream();

        this.logger = getLogger(this);
    }

    async init(): Promise<void> {
        // TODO: useless. config provided from sequence identify.
    }

    private async createFifo(dir: string, fifoName: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const fifoPath: string = shellescape([dir + "/" + fifoName]).replace(/\'/g, "");

            exec(`mkfifo ${fifoPath}`, async (error) => {
                if (error) {
                    // eslint-disable-next-line no-console
                    console.error(`exec error: ${error}`);
                    reject(error);
                }

                await chmod(fifoPath, 0o660);

                resolve(fifoPath);
            });
        });
    }
    // eslint-disable-next-line valid-jsdoc
    private async createFifoStreams(
        controlFifo: string,
        monitorFifo: string,
        loggerFifo: string,
        inputFifo: string,
        outputFifo: string
    ): Promise<string> {
        const dirPrefix: string = "fifos";
        const createdDir = await mkdtemp(path.join(tmpdir(), dirPrefix));

        this.logger.log("Directory for FiFo files created: ", createdDir);

        [
            this.controlFifoPath,
            this.monitorFifoPath,
            this.loggerFifoPath,
            this.inputFifoPath,
            this.outputFifoPath
        ] = await Promise.all([
            this.createFifo(createdDir, controlFifo),
            this.createFifo(createdDir, monitorFifo),
            this.createFifo(createdDir, loggerFifo),
            this.createFifo(createdDir, inputFifo),
            this.createFifo(createdDir, outputFifo)
        ]);

        await chmod(createdDir, 0o750);

        return createdDir;
    }

    private async preparePortBindingsConfig(declaredPorts: string[], hostIp: string, exposed = false) {
        if (declaredPorts.every(entry => (/^\d{3,5}\/(tcp|udp)$/).test(entry))) {
            const freePorts = exposed ? [] : await FreePortsFinder.getPorts(
                declaredPorts.length, ...configService.getConfig().docker.exposePortsRange
            );

            return declaredPorts.reduce((obj: { [ key: string ]: any }, entry: string) => {
                if (entry) {
                    const { port, protocol } = entry.match(/^(?<port>\d{3,5})\/(?<protocol>(tcp|udp))$/)?.groups as { port: string, protocol: string };

                    obj[`${port}/${protocol}`] = exposed ? {} : [{ HostIp: hostIp, HostPort: freePorts?.pop()?.toString() }];
                }
                return obj;
            }, {});
        }

        throw new SupervisorError("INVALID_CONFIGURATION", "Incorrect ports configuration provided.");
    }

    async getPortsConfig(ports: string[]): Promise<DockerAdapterRunPortsConfig> {
        const { hostIp } = configService.getConfig().docker;

        const [ExposedPorts, PortBindings] = await Promise.all([
            this.preparePortBindingsConfig(ports, hostIp, true),
            this.preparePortBindingsConfig(ports, hostIp, false)
        ]);

        return { ExposedPorts, PortBindings };
    }

    async stats(msg: MonitoringMessageData): Promise<MonitoringMessageData> {
        if (this.resources.containerId) {
            const stats = await this.dockerHelper.stats(this.resources.containerId)!;

            return {
                cpuTotalUsage: stats.cpu_stats?.cpu_usage?.total_usage,
                healthy: msg.healthy,
                limit: stats.memory_stats?.limit,
                memoryMaxUsage: stats.memory_stats?.max_usage,
                memoryUsage: stats.memory_stats?.usage,
                networkRx: stats.networks?.eth0?.rx_bytes,
                networkTx: stats.networks?.eth0?.tx_bytes,
                containerId: this.resources.containerId
            };
        }

        return msg;
    }

    hookCommunicationHandler(communicationHandler: ICommunicationHandler): void {
        const downstreamStreamsConfig: DownstreamStreamsConfig = [
            this.runnerStdin,
            this.runnerStdout,
            this.runnerStderr,
            this.controlStream.getStream(),
            this.monitorStream.getStream(),
            this.inputStream.getStream(),
            this.outputStream.getStream(),
            this.loggerStream.getStream(),
        ];

        communicationHandler.hookDownstreamStreams(downstreamStreamsConfig);

        communicationHandler.addMonitoringHandler(RunnerMessageCode.PING, (data) => {
            if (this.resources.ports) {
                const ports: { [key: string]: string } = {};
                const portsInfo = this.resources.ports?.PortBindings;

                for (const port in portsInfo) {
                    if (Object.prototype.hasOwnProperty.call(portsInfo, port)) {
                        ports[port] = portsInfo[port][0].HostPort;
                    }
                }

                data[1] = {
                    ...data[1],
                    ports
                };
            }

            return data;
        });
    }

    // eslint-disable-next-line complexity
    async run(config: RunnerConfig): Promise<ExitCode> {
        [
            this.resources.fifosDir,
            this.resources.ports
        ] = await Promise.all([
            this.createFifoStreams(
                "control.fifo",
                "monitor.fifo",
                "logger.fifo",
                "input.fifo",
                "output.fifo"
            ),
            config.config?.ports ? this.getPortsConfig(config.config.ports) : undefined,
        ]);

        this.logger.info("Instance preparation done.");

        if (
            typeof this.monitorFifoPath === "undefined" ||
            typeof this.controlFifoPath === "undefined" ||
            typeof this.loggerFifoPath === "undefined" ||
            typeof this.inputFifoPath === "undefined" ||
            typeof this.outputFifoPath === "undefined"
        ) {
            throw new SupervisorError("SEQUENCE_RUN_BEFORE_INIT");
        }

        this.monitorStream.run(createReadStream(this.monitorFifoPath));
        this.controlStream.run(createWriteStream(this.controlFifoPath));
        this.loggerStream.run(createReadStream(this.loggerFifoPath));
        this.inputStream.run(createWriteStream(this.inputFifoPath));
        this.outputStream.run(createReadStream(this.outputFifoPath));

        const extraVolumes: DockerAdapterVolumeConfig[] = [];

        if (development()) {
            this.logger.debug("Development mode on.");

            if (process.env.CSI_COREDUMP_VOLUME) {
                this.logger.debug("CSI_COREDUMP_VOLUME", process.env.CSI_COREDUMP_VOLUME);

                extraVolumes.push({
                    mountPoint: "/cores",
                    bind: process.env.CSI_COREDUMP_VOLUME
                });
            }
        }

        this.logger.log("Starting Runner...", config.container);

        const { streams, containerId } = await this.dockerHelper.run({
            imageName: config.container.image || "",
            volumes: [
                ...extraVolumes,
                { mountPoint: "/package", volume: config.packageVolumeId || "" }
            ],
            labels: {
                "scramjet.sequence.name": config.name
            },
            binds: [
                `${this.resources.fifosDir}:/pipes`
            ],
            ports: this.resources.ports,
            publishAllPorts: true,
            envs: ["FIFOS_DIR=/pipes", `SEQUENCE_PATH=${config.sequencePath}`],
            autoRemove: true,
            maxMem: config.container.maxMem
        });

        this.resources.containerId = containerId;

        this.runnerStdin.pipe(streams.stdin);
        streams.stdout.pipe(this.runnerStdout);
        streams.stderr.pipe(this.runnerStderr);

        this.logger.log(`Container is running (${containerId}).`);

        try {
            const { statusCode } = await this.dockerHelper.wait(containerId);

            this.logger.log("Container exited.");

            await defer(10000);

            if (statusCode > 0) {
                throw new SupervisorError("RUNNER_NON_ZERO_EXITCODE", { statusCode });
            } else {
                return 0;
            }
        } catch (error: any) {
            if (error instanceof SupervisorError && error.code === "RUNNER_NON_ZERO_EXITCODE" && error.data.statusCode) {
                this.logger.debug("Container retunrned non-zero status code", error.data.statusCode);

                return error.data.statusCode;
            }

            this.logger.debug("Container errored.", error);
            throw error;
        }
    }

    async cleanup(): Promise<void> {
        if (this.resources.volumeId) {
            this.logger.log("Volume will be removed in 1 sec");

            await defer(1000);
            await this.dockerHelper.removeVolume(this.resources.volumeId);

            this.logger.log("Volume removed");
        }

        if (this.resources.fifosDir) {
            await rm(this.resources.fifosDir, { recursive: true });

            this.logger.log("Fifo folder removed.");
        }
    }

    // returns url identifier of made snapshot
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    snapshot(): MaybePromise<string> {
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    monitorRate(rps: number): this {
    }

    async remove() {
        if (this.resources.containerId) {
            this.logger.log("Forcefully stopping containter", this.resources.containerId);

            await this.dockerHelper.stopContainer(this.resources.containerId);

            this.logger.log("Container removed.");
        }
    }
}

export { LifecycleDockerAdapterInstance };

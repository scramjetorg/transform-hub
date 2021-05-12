import { development, imageConfig } from "@scramjet/csi-config";
import { getLogger } from "@scramjet/logger";
import { MonitoringMessageData, SupervisorError } from "@scramjet/model";
import {
    DelayedStream,
    DownstreamStreamsConfig,
    ExitCode,
    ICommunicationHandler,
    IComponent,
    ILifeCycleAdapter,
    Logger,
    MaybePromise,
    RunnerConfig
} from "@scramjet/types";
import { exec } from "child_process";
import { createReadStream, createWriteStream } from "fs";
import { chmod, mkdtemp, rmdir } from "fs/promises";
import { tmpdir } from "os";
import * as path from "path";
import * as shellescape from "shell-escape";
import { PassThrough, Readable } from "stream";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import { DockerAdapterResources, DockerAdapterRunResponse, IDockerHelper } from "./types";

class LifecycleDockerAdapter implements
ILifeCycleAdapter,
IComponent {
    private dockerHelper: IDockerHelper;

    private monitorFifoPath?: string;
    private controlFifoPath?: string;
    private inputFifoPath?: string;
    private outputFifoPath?: string;
    private loggerFifoPath?: string;

    private imageConfig: {
        runner?: string,
        prerunner?: string
    } = {};

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
        this.imageConfig = await imageConfig();
    }

    private async createFifo(dir: string, fifoName: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const fifoPath: string = shellescape([dir + "/" + fifoName]).replace(/\'/g, "");

            exec(`mkfifo ${fifoPath}`, async (error) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    reject(error);
                }

                await chmod(fifoPath, 0o660);

                resolve(fifoPath);
            });
        });
    }
    // eslint-disable-next-line valid-jsdoc
    /**
     * @analyze-how-to-pass-in-out-streams
     * Additional two fifo files need to be be created:
     * input.fifo - input stream to the Sequence
     * output.fifo - output stream for a Sequence
     */
    private async createFifoStreams(
        controlFifo: string,
        monitorFifo: string,
        loggerFifo: string,
        inputFifo: string,
        outputFifo: string
    ): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const dirPrefix: string = "fifos";

            let createdDir: string;

            try {
                createdDir = await mkdtemp(path.join(tmpdir(), dirPrefix));

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

                resolve(createdDir);
            } catch (err) {
                reject(err);
            }
        });
    }

    async stats(msg: MonitoringMessageData): Promise<MonitoringMessageData> {
        if (this.resources.containerId) {
            const stats = await this.dockerHelper.stats(this.resources.containerId);

            if (stats) {
                return {
                    cpuTotalUsage: stats.cpu_stats?.cpu_usage?.total_usage,
                    healthy: msg.healthy,
                    limit: stats.memory_stats?.limit,
                    memoryMaxUsage: stats.memory_stats?.max_usage,
                    memoryUsage: stats.memory_stats?.usage,
                    networkRx: stats.networks?.eth0?.rx_bytes,
                    networkTx: stats.networks?.eth0?.tx_bytes
                };
            }
        }

        return msg;
    }

    identify(stream: Readable): MaybePromise<RunnerConfig> {
        return new Promise(async (resolve) => {
            const volumes = [];

            if (development() && process.env.HOT_VOLUME) {
                volumes.push(
                    ...process.env.HOT_VOLUME
                        .split(",")
                        .map((volume) => volume.split(":"))
                        .map(([bind, mountPoint]) => ({ mountPoint, bind }))
                );

                this.logger.warn("Using hot volume configuration", volumes);
            } else {
                this.logger.info("No hacks", development(), process.env.HOT_VOLUME);
            }

            try {
                this.resources.volumeId = await this.dockerHelper.createVolume();

                this.logger.log("Volume created. Id: ", this.resources.volumeId);
            } catch (error) {
                throw new SupervisorError("DOCKER_ERROR", "Error creating volume");
            }

            let runResult: DockerAdapterRunResponse;

            try {
                runResult = await this.dockerHelper.run({
                    imageName: this.imageConfig.prerunner || "",
                    volumes: [
                        { mountPoint: "/package", volume: this.resources.volumeId },
                        ...volumes
                    ],
                    autoRemove: true
                });
            } catch {
                throw new SupervisorError("DOCKER_ERROR");
            }

            const { streams, wait } = runResult;

            stream.pipe(streams.stdin);

            const preRunnerResponseChunks: Uint8Array[] = [];

            streams.stdout
                .on("data", (chunk) => {
                    preRunnerResponseChunks.push(Buffer.from(chunk));
                })
                .on("error", () => {
                    throw new SupervisorError("PRERUNNER_ERROR");
                })
                .on("end", async () => {
                    const res = JSON.parse(Buffer.concat(preRunnerResponseChunks).toString("utf8"));

                    resolve({
                        image: this.imageConfig.runner || "",
                        version: res.version || "",
                        engines: {
                            ...res.engines
                        },
                        sequencePath: res.main,
                        packageVolumeId: this.resources.volumeId
                    });
                });

            await wait();
        });
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
    }

    async run(config: RunnerConfig): Promise<ExitCode> {
        this.resources.fifosDir = await this.createFifoStreams(
            "control.fifo",
            "monitor.fifo",
            "logger.fifo",
            "input.fifo",
            "output.fifo");

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

        this.logger.debug("Creating container");

        return new Promise(async (resolve, reject) => {
            const { streams, containerId } = await this.dockerHelper.run({
                imageName: this.imageConfig.runner || "",
                volumes: [
                    { mountPoint: "/package", volume: config.packageVolumeId || "" }
                ],
                binds: [
                    `${this.resources.fifosDir}:/pipes`
                ],
                envs: ["FIFOS_DIR=/pipes", `SEQUENCE_PATH=${config.sequencePath}`],
                autoRemove: true,
                maxMem: 256 * 1024 * 1024 // TODO: config
            });

            this.resources.containerId = containerId;

            this.runnerStdin.pipe(streams.stdin);
            streams.stdout.pipe(this.runnerStdout);
            streams.stderr.pipe(this.runnerStderr);

            this.logger.debug(`Container is running (${containerId})`);

            try {
                const { statusCode } = await this.dockerHelper.wait(containerId);

                this.logger.debug("Container exited");

                setTimeout(() => {
                    if (statusCode > 0)
                        reject(new SupervisorError("RUNNER_NON_ZERO_EXITCODE", { statusCode }));
                    else
                        resolve(0);
                }, 100);
            } catch (error) {
                if (error instanceof SupervisorError && error.code === "RUNNER_NON_ZERO_EXITCODE" && error.data.statusCode) {
                    this.logger.debug("Container retunrned non-zero status code", error.data.statusCode);

                    resolve(error.data.statusCode);
                } else {
                    this.logger.debug("Container errored", error);
                    reject(error);
                }
            }
        });
    }

    cleanup(): MaybePromise<void> {
        return new Promise(async (resolve) => {
            if (this.resources.volumeId) {
                this.logger.log("Volume will be removed in 1 sec");

                await new Promise(res => setTimeout(res, 1000));
                await this.dockerHelper.removeVolume(this.resources.volumeId);

                this.logger.log("Volume removed");
            }

            if (this.resources.fifosDir) {
                await rmdir(this.resources.fifosDir, { recursive: true });

                this.logger.log("Fifo folder removed");
            }

            resolve();
        });
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


    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    stop(): MaybePromise<void> {
        /*
        * @feature/analysis-stop-kill-invocation
        * This method is called by the LifeCycle Controller instance when it receives the stop message.
        * The method requires two arguments:
        * timeout: number
        * canCallKeepalive: boolean
        * that must be added to the LifeCycle interface.
        * We must create a stop message and sent it using the control stream.
        * The Runner should send us back the response with the Sequence's status (not completed yet),
        *  and (optionally) exit code and error (if the Sequence stopped but threw errors).
        */
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async remove() {
        if (this.resources.containerId) {
            this.logger.info("Forcefully stopping containter", this.resources.containerId);

            await this.dockerHelper.stopContainer(this.resources.containerId);

            this.logger.info("Container removed");
        }

        /*
        * @feature/analysis-stop-kill-invocation
        * This method is called by the LifeCycle Controller instance when it receives the kill message.
        * We must creates the kill message and sent it using the control stream.
        * The Runner should send us the response with exit code using the monitoring stream.
        */
    }
}

export { LifecycleDockerAdapter };

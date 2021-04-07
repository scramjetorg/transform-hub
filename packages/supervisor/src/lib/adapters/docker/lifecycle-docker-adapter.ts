import { imageConfig } from "@scramjet/csi-config";
import { AppError } from "@scramjet/model";
import { ICommunicationHandler } from "@scramjet/types";
import {
    DelayedStream,
    DownstreamStreamsConfig,
    ExitCode,
    ILifeCycleAdapter,
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
import { DockerAdapterResources, IDockerHelper } from "./types";

class LifecycleDockerAdapter implements ILifeCycleAdapter {
    private dockerHelper: IDockerHelper;

    // TODO: why these ignores?
    // @ts-ignore
    private runnerConfig?: string;
    // @ts-ignore
    private prerunnerConfig?: string;

    private monitorFifoPath?: string;
    private controlFifoPath?: string;

    private imageConfig: {
        runner?: string,
        prerunner?: string
    } = {};

    private runnerStdin: PassThrough;
    private runnerStdout: PassThrough;
    private runnerStderr: PassThrough;
    private monitorStream: DelayedStream;
    private controlStream: DelayedStream;
    /**
     * @analyze-how-to-pass-in-out-streams
     * Additional two streams need to be created:
     * inputStream - input stream to the Sequence
     * outputStream - output stream for a Sequence
     */

    private resources: DockerAdapterResources = {};

    constructor() {
        this.runnerStdin = new PassThrough();
        this.runnerStdout = new PassThrough();
        this.runnerStderr = new PassThrough();
        this.dockerHelper = new DockerodeDockerHelper();
        this.monitorStream = new DelayedStream();
        this.controlStream = new DelayedStream();
        /**
         * @analyze-how-to-pass-in-out-streams
         * Initiate two streams with as DelayedStream():
         * inputStream - input stream to the Sequence
         * outputStream - output stream for a Sequence
         */
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
    private async createFifoStreams(controlFifo: string, monitorFifo: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const dirPrefix: string = "fifos";

            let createdDir: string;

            try {
                createdDir = await mkdtemp(path.join(tmpdir(), dirPrefix));

                //TODO: TBD how to allow docker user "runner" to access this directory.

                [this.controlFifoPath, this.monitorFifoPath] = await Promise.all([
                    this.createFifo(createdDir, controlFifo),
                    this.createFifo(createdDir, monitorFifo)]);

                await chmod(createdDir, 0o750);

                resolve(createdDir);
            } catch (err) {
                reject(err);
            }
        });
    }

    identify(stream: Readable): MaybePromise<RunnerConfig> {
        return new Promise(async (resolve) => {
            this.resources.volumeId = await this.dockerHelper.createVolume();

            const { streams, wait } = await this.dockerHelper.run({
                imageName: this.imageConfig.prerunner || "",
                volumes: [
                    { mountPoint: "/package", volume: this.resources.volumeId }
                ],
                autoRemove: true
            });

            stream.pipe(streams.stdin);

            let preRunnerResponse = "";

            streams.stdout
                .on("data", (chunk) => {
                    preRunnerResponse += chunk.toString();
                })
                .on("end", async () => {
                    const res = JSON.parse(preRunnerResponse);

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
        const downstreamStreamsConfig: DownstreamStreamsConfig =
            [
                this.runnerStdin,
                this.runnerStdout,
                this.runnerStderr,
                this.controlStream.getStream(),
                this.monitorStream.getStream()
                /**
                 * @analyze-how-to-pass-in-out-streams
                 * Input and output streams need to be 
                 * added to this table a similar way to control and
                 * monitor stream.
                 */
            ];

        communicationHandler.hookDownstreamStreams(downstreamStreamsConfig);
    }

    async run(config: RunnerConfig): Promise<ExitCode> {
        this.resources.fifosDir = await this.createFifoStreams("control.fifo", "monitor.fifo");

        if (
            typeof this.monitorFifoPath === "undefined" ||
            typeof this.controlFifoPath === "undefined"
        ) {
            throw new AppError("SEQUENCE_RUN_BEFORE_INIT");
        }

        this.monitorStream.run(createReadStream(this.monitorFifoPath));
        this.controlStream.run(createWriteStream(this.controlFifoPath));

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
                autoRemove: true
            });

            this.runnerStdin.pipe(streams.stdin);
            streams.stdout.pipe(this.runnerStdout);
            streams.stderr.pipe(this.runnerStderr);

            const { error, statusCode } = await this.dockerHelper.wait(containerId, { condition: "removed" });

            console.log(
                "Runner container finished with exit code", statusCode
            );

            if (error) {
                reject(statusCode);
            } else {
                resolve(statusCode);
            }
        });
    }

    cleanup(): MaybePromise<void> {
        return new Promise(async (resolve) => {
            if (this.resources.volumeId) {
                await this.dockerHelper.removeVolume(this.resources.volumeId);
                console.log("Volume removed");
            }

            if (this.resources.fifosDir) {
                await rmdir(this.resources.fifosDir, { recursive: true });
                console.log("Fifo folder removed");
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
    kill(): MaybePromise<void> {
        /*
        * @feature/analysis-stop-kill-invocation
        * This method is called by the LifeCycle Controller instance when it receives the kill message.
        * We must creates the kill message and sent it using the control stream.
        * The Runner should send us the response with exit code using the monitoring stream.
        */
    }
}

export { LifecycleDockerAdapter };

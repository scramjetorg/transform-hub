import { LifeCycle, RunnerConfig, ExitCode } from "@scramjet/types/src/lifecycle";
import { DelayedStream, MaybePromise, ReadableStream } from "@scramjet/types/src/utils";
import { CommunicationHandler } from "@scramjet/model/src/stream-handler";
import { DownstreamStreamsConfig } from "@scramjet/types/src/message-streams";
import { createReadStream, createWriteStream, readFile } from "fs";
import { Readable, Writable } from "stream";
import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import * as path from "path";
import { exec } from "child_process";
import * as shellescape from "shell-escape";

import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import { DockerHelper, DockerVolume } from "./types";


class LifecycleDockerAdapter implements LifeCycle {
    private dockerHelper: DockerHelper;

    // @ts-ignore
    private runnerConfig?: string;
    // @ts-ignore
    private prerunnerConfig?: string;
    // @ts-ignore
    private monitorFifoPath: string;
    // @ts-ignore
    private controlFifoPath: string;
    private imageConfig: {
        runner?: string,
        prerunner?: string
    } = {};

    private runnerStdin: Writable;
    private runnerStdout: Readable;
    private runnerStderr: Readable;
    private monitorStream: DelayedStream;
    private controlStream: DelayedStream;

    constructor() {
        this.runnerStdin = new Writable();
        this.runnerStdout = new Readable();
        this.runnerStderr = new Readable();
        this.dockerHelper = new DockerodeDockerHelper();
        this.monitorStream = new DelayedStream();
        this.controlStream = new DelayedStream();
    }

    async init(): Promise<void> {
        return new Promise((res, rej) => {
            readFile("../../../image-config.json", { encoding: "utf-8" }, (err, data) => {
                if (err) {
                    rej(err);
                }

                this.imageConfig = JSON.parse(data);
                res();
            });
        });
    }

    private async createFifo(dir: string, fifoName: string): Promise<string> {
        const fifoPath: string = shellescape([dir + "/" + fifoName]);

        await new Promise<void>((resolve, reject) => {
            exec(`mkfifo ${fifoPath}`, (error) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    reject(error);
                }
                console.log(fifoPath + " has been created.");
                resolve();
            });
        });

        return fifoPath;
    }

    private async createFifoStreams(controlFifo: string, monitorFifo: string): Promise<void> {
        const dirPrefix: string = "fifos";
        let createdDir: string;

        try {
            createdDir = await mkdtemp(path.join(tmpdir(), dirPrefix));
            console.log(createdDir + " has been created.");
            [this.controlFifoPath, this.monitorFifoPath] = await Promise.all([
                this.createFifo(createdDir, controlFifo),
                this.createFifo(createdDir, monitorFifo)]);
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    identify(stream: Readable): MaybePromise<RunnerConfig> {
        return new Promise(async (resolve) => {
            const volume: DockerVolume = await this.dockerHelper.createVolume();

            const { streams, stopAndRemove } = await this.dockerHelper.run({
                imageName: this.imageConfig.prerunner || "",
                command: ["sh", "/unpack-identify.sh"],
                volumes: [
                    { mountPoint: "/package", volume }
                ]
            });

            stream.pipe(streams.stdin);

            let preRunnerResponse = "";

            streams.stdout
                .on("data", (chunk) => {
                    preRunnerResponse += chunk.toString();
                })
                .on("end", async () => {
                    const res = JSON.parse(preRunnerResponse);

                    await stopAndRemove();

                    resolve({
                        image: this.imageConfig.runner || "",
                        version: res.version || "",
                        engines: {
                            ...res.engines
                        },
                        packageVolumeId: volume
                    });
                });
        });
    }

    hookCommunicationHandler(communicationHandler: CommunicationHandler): void {
        const downstreamStreamsConfig: DownstreamStreamsConfig =
            [
                this.runnerStdin,
                this.runnerStdout,
                this.runnerStderr,
                this.controlStream.getStream(),
                this.monitorStream.getStream()
            ];

        communicationHandler.hookLifecycleStreams(downstreamStreamsConfig);
    }


    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async run(config: RunnerConfig): Promise<ExitCode> {
        await this.createFifoStreams("monitor.fifo", "control.fifo");
        
        this.monitorStream.run(createReadStream(this.monitorFifoPath));
        this.controlStream.run(createWriteStream(this.controlFifoPath));

        //TODO  
        // new Promise(async (resolve) => {
        //     const { streams, stopAndRemove } = await this.dockerHelper.run(config);

        //     streams.stdin.pipe(this.runnerStdin);
        //     streams.stdout.pipe(this.runnerStdout);
        //     streams.stderr.pipe(this.runnerStderr);

        //     stopAndRemove();
        // }); 

        return 0;
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cleanup(): MaybePromise<void> {
    }

    // returns url identifier of made snapshot
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    snapshot(): MaybePromise<string> {
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    pushStdio(stream: "stdin" | 0, input: ReadableStream<string>): this {
        throw new Error("To delete later.");
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    readStdio(stream: "stdout" | 1): ReadableStream<string> {
        throw new Error("To delete later.");
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    readStdio(stream: "stderr" | 2): ReadableStream<string> {
        throw new Error("To delete later.");
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    monitorRate(rps: number): this {
    }


    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    stop(): MaybePromise<void> {
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kill(): MaybePromise<void> {
    }
}

export { LifecycleDockerAdapter };

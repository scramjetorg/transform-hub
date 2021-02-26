
import { LifeCycle, RunnerConfig, ExitCode } from "@scramjet/types/src/lifecycle";
import { MaybePromise, ReadableStream } from "@scramjet/types/src/utils";
import { MonitoringMessage } from "@scramjet/types/src/runner";

import { Readable } from "stream";
import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import * as path from "path";
import { exec } from "child_process";
import * as shellescape from "shell-escape";
import * as fs from "fs";

import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import { DockerHelper, DockerVolume } from "./types";
class LifecycleDockerAdapter implements LifeCycle {
    private dockerHelper: DockerHelper;

    // @ts-ignore
    private runnerConfig?: string;
    // @ts-ignore
    private prerunnerConfig?: string;
    // @ts-ignore
    private monitorFifoPath?: string;
    // @ts-ignore
    private controlFifoPath?: string;
    private imageConfig: {
        runner?: string,
        prerunner?: string
    } = {};

    constructor() {
        this.dockerHelper = new DockerodeDockerHelper();
    }

    async init(): Promise<void> {
        return new Promise((res, rej) => {
            fs.readFile("../../../image-config.json", { encoding: "utf-8" }, (err, data) => {
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

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async run(config: RunnerConfig): Promise<ExitCode> {
        await this.createFifoStreams("monitor.fifo", "control.fifo");
        //TODO add logic here
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
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    readStdio(stream: "stdout" | 1): ReadableStream<string> {
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    readStdio(stream: "stderr" | 2): ReadableStream<string> {
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    monitorRate(rps: number): this {
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    monitor(): ReadableStream<MonitoringMessage> {
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

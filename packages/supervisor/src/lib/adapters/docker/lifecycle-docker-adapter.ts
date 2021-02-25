import { LifeCycle, RunnerConfig, ExitCode } from "@scramjet/types/src/lifecycle";
import { MaybePromise, ReadableStream } from "@scramjet/types/src/utils";
import { MonitoringMessage } from "@scramjet/types/src/runner";
import { Readable } from "stream";


const data = require("../../../image-config.json");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class LifecycleDockerAdapter implements LifeCycle {
    // @ts-ignore
    private runnerConfig?: string;
    // @ts-ignore
    private prerunnerConfig?: string;

    async init(): Promise<void> {
        this.runnerConfig = data.runner;
        this.prerunnerConfig = data.prerunner;
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    identify(stream: Readable): MaybePromise<RunnerConfig> {
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    run(config: RunnerConfig): Promise<ExitCode> {
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
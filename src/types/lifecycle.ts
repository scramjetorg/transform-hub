import { Readable } from "stream";
import { MonitoringMessage } from "./runner";
import { MaybePromise, ReadableStream } from "./utils";

export type RunnerConfig = {
    image: string;
    version: string;
    engines: {
        [key: string]: string
    };
    config?: any;
}

export type DockerRunnerConfig = RunnerConfig & {
    config: {volumesFrom: string};
}

export interface LifeCycle {
    idenitfy(stream: Readable): MaybePromise<RunnerConfig>;
    run(config: RunnerConfig): MaybePromise<void>;

    pushStdio(stream: "stdin", input: ReadableStream<string>): this;
    readStdio(stream: "stdout"): ReadableStream<string>;
    readStdio(stream: "stderr"): ReadableStream<string>;

    monitorRate(rps: number): this;
    monitor(): ReadableStream<MonitoringMessage>;

    stop(): MaybePromise<void>;
    kill(): MaybePromise<void>;
}

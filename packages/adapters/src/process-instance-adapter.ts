import { getLogger } from "@scramjet/logger";
import {
    ExitCode,
    IComponent,
    ILifeCycleAdapterMain,
    ILifeCycleAdapterRun,
    Logger,
    MaybePromise,
    MonitoringMessageData,
    SequenceConfig
} from "@scramjet/types";
import { ChildProcess, spawn } from "child_process";

import * as path from "path";

const isTSNode = !!(process as any)[Symbol.for("ts-node.register.instance")];

const runnerCommand = [
    isTSNode ? "ts-node" : process.execPath,
    path.resolve(__dirname, require.resolve("@scramjet/runner"))
];

class ProcessInstanceAdapter implements
ILifeCycleAdapterMain,
ILifeCycleAdapterRun,
IComponent {
    logger: Logger;

    private runnerProcess?: ChildProcess;

    constructor() {
        this.logger = getLogger(this);
    }

    async init(): Promise<void> {
        // noop
    }

    async stats(msg: MonitoringMessageData): Promise<MonitoringMessageData> {
        const { runnerProcess } = this;

        if (!runnerProcess) {
            // Runner process not initialized yet
            return msg;
        }

        return {
            ...msg,
            processId: this.runnerProcess?.pid
        };
    }

    async run(config: SequenceConfig, instancesServerPort: number, instanceId: string): Promise<ExitCode> {
        if (config.type !== "process") {
            throw new Error("Process instance adapter run with invalid runner config");
        }

        this.logger.info("Instance preparation done.");

        this.logger.log("Starting Runner...", config.id);

        const sequencePath = path.join(
            config.sequenceDir,
            config.entrypointPath
        );

        this.logger.log("Spawning Runner process with command", runnerCommand, "and envs: ", {
            DEVELOPMENT: process.env.DEVELOPMENT,
            PRODUCTION: process.env.PRODUCTION,
            SEQUENCE_PATH: sequencePath,
            INSTANCES_SERVER_PORT: instancesServerPort,
            INSTANCE_ID: instanceId
        });

        const runnerProcess = spawn(runnerCommand[0], runnerCommand.slice(1), {
            env: {
                PATH: process.env.PATH,
                DEVELOPMENT: process.env.DEVELOPMENT,
                PRODUCTION: process.env.PRODUCTION,
                SEQUENCE_PATH: sequencePath,
                INSTANCES_SERVER_PORT: instancesServerPort.toString(),
                INSTANCE_ID: instanceId
            }
        });

        this.logger.log(`Runner process is running (${runnerProcess.pid}).`);

        this.runnerProcess = runnerProcess;

        const [statusCode, signal] = await new Promise<[number | null, NodeJS.Signals | null]>(
            (res) => runnerProcess.on("exit", (code, sig) => res([code, sig]))
        );

        this.logger.log("Process exited.");

        if (statusCode === null) {
            this.logger.warn(`Runner was killed by a signal ${signal}, and didn't return a status code`);
            // Probably SIGIKLL
            return 137;
        }

        if (statusCode > 0) {
            this.logger.debug("Process returned non-zero status code", statusCode);
        }

        return statusCode;
    }

    async cleanup(): Promise<void> {
        //noop
    }
    // @ts-ignore
    snapshot(): MaybePromise<string> {
        /** ignore */
    }

    // @ts-ignore
    monitorRate(_rps: number): this {
        /** ignore */
    }

    async remove() {
        this.runnerProcess?.kill();
    }
}

export { ProcessInstanceAdapter };

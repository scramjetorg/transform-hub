import { ObjLogger } from "@scramjet/obj-logger";
import {
    ExitCode,
    IComponent,
    ILifeCycleAdapterMain,
    ILifeCycleAdapterRun,
    IObjectLogger,
    MonitoringMessageData,
    SequenceConfig
} from "@scramjet/types";
import { ChildProcess, spawn } from "child_process";

import path from "path";

const isTSNode = !!(process as any)[Symbol.for("ts-node.register.instance")];
const gotPython = "\n                              _ \n __      _____  _ __  ___ ___| |\n \\ \\ /\\ / / _ \\| '_ \\/ __|_  / |\n  \\ V  V / (_) | | | \\__ \\/ /|_|\n   \\_/\\_/ \\___/|_| |_|___/___(_)  🐍\n";

/**
 * Adapter for running Instance by Runner executed in separate process.
 */
class ProcessInstanceAdapter implements
ILifeCycleAdapterMain,
ILifeCycleAdapterRun,
IComponent {
    objLogger: IObjectLogger;

    private runnerProcess?: ChildProcess;

    constructor() {
        this.objLogger = new ObjLogger(this);
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

    getRunnerCmd(config: SequenceConfig) {
        if (config.entrypointPath.endsWith(".py")) {
            this.objLogger.trace(gotPython);

            return [
                "python3",
                path.resolve(__dirname, "../../../python/runner/runner.py")
            ];
        }
        return [
            isTSNode ? "ts-node" : process.execPath,
            path.resolve(__dirname,
                process.env.ESBUILD
                    ? "../../runner/bin/start-runner.js"
                    : require.resolve("@scramjet/runner")
            )
        ];
    }

    async run(config: SequenceConfig, instancesServerPort: number, instanceId: string): Promise<ExitCode> {
        if (config.type !== "process") {
            throw new Error("Process instance adapter run with invalid runner config");
        }

        this.objLogger.info("Instance preparation done");

        this.objLogger.trace("Starting Runner", config.id);

        const runnerCommand = this.getRunnerCmd(config);

        const sequencePath = path.join(
            config.sequenceDir,
            config.entrypointPath
        );

        this.objLogger.debug("Spawning Runner process with command", runnerCommand, "and envs: ", {
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
                INSTANCES_SERVER_HOST: "127.0.0.1",
                INSTANCE_ID: instanceId,
            }
        });

        this.objLogger.trace("Runner process is running", runnerProcess.pid);

        this.runnerProcess = runnerProcess;

        const [statusCode, signal] = await new Promise<[number | null, NodeJS.Signals | null]>(
            (res) => runnerProcess.on("exit", (code, sig) => res([code, sig]))
        );

        this.objLogger.trace("Runner process exited", runnerProcess.pid);

        if (statusCode === null) {
            this.objLogger.warn("Runner was killed by a signal, and didn't return a status code", signal);

            // Probably SIGIKLL
            return 137;
        }

        if (statusCode > 0) {
            this.objLogger.debug("Process returned non-zero status code", statusCode);
        }

        return statusCode;
    }

    /**
     * Performs cleanup after Runner end.
     * Removes fifos used to communication with runner.
     */
    async cleanup(): Promise<void> {
        //noop
    }

    // @ts-ignore
    monitorRate(_rps: number): this {
        /** ignore */
    }

    /**
     * Forcefully stops Runner process.
     */
    async remove() {
        this.runnerProcess?.kill();
    }
}

export { ProcessInstanceAdapter };

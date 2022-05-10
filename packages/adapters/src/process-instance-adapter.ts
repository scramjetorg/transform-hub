import { ObjLogger } from "@scramjet/obj-logger";
import { development } from "@scramjet/sth-config";
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
    logger: IObjectLogger;

    private runnerProcess?: ChildProcess;

    constructor() {
        this.logger = new ObjLogger(this);
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
        const engines = Object.keys(config.engines);

        if (engines.length > 1) {
            throw new Error("Incorrect config passed to SequenceConfig," +
            "'engines' field can't contain more than one element");
        }

        if ("python3" in config.engines) {
            this.logger.trace(gotPython);
            const runnerPath = path.resolve(__dirname, require.resolve("@scramjet/python-runner"));

            return [
                "/usr/bin/env",
                "python3",
                path.resolve(__dirname, runnerPath),
                "./python-runner-startup.log",
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

    getPythonpath(sequenceDir: string) {
        // This is for running from source. When the package is built, dependencies
        // are installed next to runner.py script (rather than in __pypackages__),
        // but that directory is automatically included in PYTHONPATH.
        let pythonpath = path.resolve(
            __dirname, require.resolve("@scramjet/python-runner"), "../__pypackages__"
        );

        if (process.env.PYTHONPATH) pythonpath += `:${process.env.PYTHONPATH}`;

        pythonpath += `:${sequenceDir}/__pypackages__`;

        return pythonpath;
    }

    async run(config: SequenceConfig, instancesServerPort: number, instanceId: string): Promise<ExitCode> {
        if (config.type !== "process") {
            throw new Error("Process instance adapter run with invalid runner config");
        }

        this.logger.info("Instance preparation done");

        this.logger.trace("Starting Runner", config.id);

        const runnerCommand = this.getRunnerCmd(config);

        const sequencePath = path.join(
            config.sequenceDir,
            config.entrypointPath
        );

        const env = {
            DEVELOPMENT: process.env.DEVELOPMENT,
            PRODUCTION: process.env.PRODUCTION,
            SEQUENCE_PATH: sequencePath,
            INSTANCES_SERVER_PORT: instancesServerPort.toString(),
            INSTANCES_SERVER_HOST: "127.0.0.1",
            INSTANCE_ID: instanceId,
            PYTHONPATH: this.getPythonpath(config.sequenceDir),
            PATH: process.env.PATH,
        };

        this.logger.debug("Spawning Runner process with command", runnerCommand);
        this.logger.trace("Runner process environment", env);

        const runnerProcess = spawn(runnerCommand[0], runnerCommand.slice(1), { env });

        if (development()) {
            runnerProcess.stdout.pipe(process.stdout);
            runnerProcess.stderr.pipe(process.stderr);
        }

        this.logger.trace("Runner process is running", runnerProcess.pid);

        this.runnerProcess = runnerProcess;

        const [statusCode, signal] = await new Promise<[number | null, NodeJS.Signals | null]>(
            (res) => runnerProcess.on("exit", (code, sig) => res([code, sig]))
        );

        this.logger.trace("Runner process exited", runnerProcess.pid);

        if (statusCode === null) {
            this.logger.warn("Runner was killed by a signal, and didn't return a status code", signal);

            // Probably SIGIKLL
            return 137;
        }

        if (statusCode > 0) {
            this.logger.debug("Process returned non-zero status code", statusCode);
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

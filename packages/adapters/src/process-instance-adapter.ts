import { ObjLogger } from "@scramjet/obj-logger";
import { streamToString } from "@scramjet/utility";
import {
    ExitCode,
    IComponent,
    ILifeCycleAdapterMain,
    ILifeCycleAdapterRun,
    InstanceConfig,
    InstanceLimits,
    IObjectLogger,
    MonitoringMessageData,
    SequenceConfig
} from "@scramjet/types";
import { ChildProcess, spawn } from "child_process";

import path from "path";
import { getRunnerEnvVariables } from "./get-runner-env";

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
    private crashLogStreams?: Promise<string[]>;
    private _limits?: InstanceLimits = {};

    get limits() { return this._limits || {} as InstanceLimits; }
    private set limits(value: InstanceLimits) {
        this._limits = value;
        this.logger.warn("Limits are not yet supported in process runner");
    }

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
            // @TODO: Provide stats and limits
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

    async run(config: InstanceConfig, instancesServerPort: number, instanceId: string): Promise<ExitCode> {
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
        const env = getRunnerEnvVariables({
            sequencePath,
            instancesServerHost: "127.0.0.1",
            instancesServerPort,
            instanceId,
            pipesPath: ""
        }, {
            PYTHONPATH: this.getPythonpath(config.sequenceDir),
        });

        this.logger.debug("Spawning Runner process with command", runnerCommand);
        this.logger.trace("Runner process environment", env);

        const runnerProcess = spawn(runnerCommand[0], runnerCommand.slice(1), { env });

        this.crashLogStreams = Promise.all([runnerProcess.stdout, runnerProcess.stderr].map(streamToString));

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

    async getCrashLog(): Promise<string[]> {
        if (!this.crashLogStreams) return [];

        return this.crashLogStreams;
    }
}

export { ProcessInstanceAdapter };

import { ObjLogger } from "@scramjet/obj-logger";
import { streamToString } from "@scramjet/utility";
import { STHConfiguration,
    ExitCode,
    IComponent,
    ILifeCycleAdapterMain,
    ILifeCycleAdapterRun,
    InstanceConfig,
    InstanceLimits,
    IObjectLogger,
    MonitoringMessageData,
    SequenceConfig,
    SequenceInfo
} from "@scramjet/types";
import { ChildProcess, spawn } from "child_process";

import path from "path";
import { getRunnerEnvVariables } from "./get-runner-env";
import { RunnerConnectInfo } from "@scramjet/types/src/runner-connect";

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
    sthConfig: STHConfiguration;

    private runnerProcess?: ChildProcess;
    private crashLogStreams?: Promise<string[]>;
    private _limits?: InstanceLimits = {};

    get limits() { return this._limits || {} as InstanceLimits; }
    private set limits(value: InstanceLimits) {
        this._limits = value;
        this.logger.warn("Limits are not yet supported in process runner");
    }

    constructor(config: STHConfiguration) {
        this.logger = new ObjLogger(this);
        this.sthConfig = config;
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
        let debugFlags: string[] = [];

        if (engines.length > 1) {
            throw new Error("Incorrect config passed to SequenceConfig," +
                "'engines' field can't contain more than one element");
        }

        if ("python3" in config.engines) {
            this.logger.trace(gotPython);
            const runnerPath = path.resolve(__dirname, require.resolve("@scramjet/python-runner"));

            if (this.sthConfig.debug)
                debugFlags = ["-m", "pdb", "-c", "continue"];

            return [
                "/usr/bin/env",
                "python3",
                ...debugFlags,
                path.resolve(__dirname, runnerPath),
                "./python-runner-startup.log",
            ];
        }
        if (this.sthConfig.debug)
            debugFlags = ["--inspect-brk=9229"];

        return [
            isTSNode ? "ts-node" : process.execPath,
            ...debugFlags,
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

    async run(config: InstanceConfig, instancesServerPort: number, instanceId: string, sequenceInfo: SequenceInfo, payload: RunnerConnectInfo): Promise<ExitCode> {
        await this.dispatch(config, instancesServerPort, instanceId, sequenceInfo, payload);
        return this.waitUntilExit(config, instanceId, sequenceInfo);
    }

    async dispatch(config: InstanceConfig, instancesServerPort: number, instanceId: string, sequenceInfo: SequenceInfo, payload: RunnerConnectInfo): Promise<void> {
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
            pipesPath: "",
            sequenceInfo,
            payload
        }, {
            PYTHONPATH: this.getPythonpath(config.sequenceDir),
        });

        this.logger.debug("Spawning Runner process with command", runnerCommand);
        this.logger.trace("Runner process environment", env);

        const runnerProcess = spawn(runnerCommand[0], runnerCommand.slice(1), { env, detached: true });

        runnerProcess.unref();

        this.crashLogStreams = Promise.all([runnerProcess.stdout, runnerProcess.stderr].map(streamToString));

        this.logger.trace("Runner process is running", runnerProcess.pid);

        // @todo exit here with pid
        // then promise waiting for process with given pid finish (endOfRun)
        // how to connect to a process knowing id of it?

        this.runnerProcess = runnerProcess;
    }

    async waitUntilExit(config: InstanceConfig, instanceId:string, _sequenceInfo: SequenceInfo): Promise<number> {
        const [statusCode, signal] = await new Promise<[number | null, NodeJS.Signals | null]>(
            (res) => this.runnerProcess?.on("exit", (code, sig) => res([code, sig]))
        );

        this.logger.trace("Runner process exited", this.runnerProcess?.pid);

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

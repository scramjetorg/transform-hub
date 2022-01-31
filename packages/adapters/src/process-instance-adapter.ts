import { ObjLogger } from "@scramjet/obj-logger";
import {
    ExitCode,
    IComponent,
    ILifeCycleAdapterMain,
    ILifeCycleAdapterRun,
    IObjectLogger,
    MonitoringMessageData,
    ProcessSequenceConfig,
    SequenceConfig
} from "@scramjet/types";
import { ChildProcess, exec, spawn } from "child_process";
import { createReadStream, stat } from "fs";

import path from "path";
import { Writable } from "stream";

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

    private config?: ProcessSequenceConfig;

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
        if (config.entrypointPath.endsWith(".py")) {
            this.logger.trace(gotPython);

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
        this.config = config;

        this.logger.trace("Starting Runner", config.id);

        const runnerCommand = this.getRunnerCmd(config);

        const sequencePath = path.join(
            config.sequenceDir,
            config.entrypointPath
        );

        this.logger.debug("Spawning Runner process with command", runnerCommand, "and envs: ", {
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

        this.logger.trace("Runner process is running", runnerProcess.pid);

        this.runnerProcess = runnerProcess;

        runnerProcess.stderr.on("data", data => {
            this.logger.error("Runner process error: ", data.toString());
        });

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

    public async sendSequenceToRunner(writeable: Writable): Promise<void> {
        const compressedFilename = path.join(this.config!.sequenceDir, "compressed.tar.gz");
        const compressProc = exec(`tar -czf ${compressedFilename} --directory=${this.config!.sequenceDir} .`);

        await new Promise(res => compressProc.on("exit", res));

        const size = await new Promise<number>(res => stat(compressedFilename, (_, stats) => res(stats.size)));

        writeable.write(size.toString() + "\r\n\r\n");

        return new Promise(res =>
            createReadStream(compressedFilename)
                .on("data", (chunk) => {
                    this.logger.debug(chunk.toString("hex").slice(-100));
                })
                .pipe(writeable, { end: false })
                .on("close", res)
        );
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

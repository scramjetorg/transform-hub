import { getLogger } from "@scramjet/logger";
import { DelayedStream, SupervisorError } from "@scramjet/model";
import {
    DownstreamStreamsConfig,
    ExitCode,
    ICommunicationHandler,
    IComponent,
    ILifeCycleAdapterMain,
    ILifeCycleAdapterRun,
    Logger,
    MaybePromise,
    MonitoringMessageData,
    SequenceConfig,
} from "@scramjet/types";
import { ChildProcess, exec, spawn } from "child_process";
import { createReadStream, createWriteStream } from "fs";
import { chmod, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import * as shellescape from "shell-escape";
import { PassThrough } from "stream";
import * as path from "path";

const isTSNode = !!(process as any)[Symbol.for("ts-node.register.instance")];

const runnerCommand = [
    isTSNode ? "ts-node" : process.execPath,
    path.resolve(__dirname, require.resolve("@scramjet/runner"))
];

/**
 * Adapter for running Instance by Runner executed in separate process.
 */
class ProcessInstanceAdapter implements
ILifeCycleAdapterMain,
ILifeCycleAdapterRun,
IComponent {
    private monitorFifoPath?: string;
    private controlFifoPath?: string;
    private inputFifoPath?: string;
    private outputFifoPath?: string;
    private loggerFifoPath?: string;

    private runnerStdin: PassThrough;
    private runnerStdout: PassThrough;
    private runnerStderr: PassThrough;
    private monitorStream: DelayedStream;
    private controlStream: DelayedStream;
    private loggerStream: DelayedStream;
    private inputStream: DelayedStream;
    private outputStream: DelayedStream;

    logger: Logger;

    private runnerProcess?: ChildProcess;
    private fifosDir?: string;

    constructor() {
        this.runnerStdin = new PassThrough();
        this.runnerStdout = new PassThrough();
        this.runnerStderr = new PassThrough();
        this.monitorStream = new DelayedStream();
        this.controlStream = new DelayedStream();
        this.loggerStream = new DelayedStream();
        this.inputStream = new DelayedStream();
        this.outputStream = new DelayedStream();

        this.logger = getLogger(this);
    }

    async init(): Promise<void> {
        // noop
    }
    /**
     * Creates fifo file.
     *
     * @param {string} dir Directory where fifo files will be created
     * @param {string} fifoName Name of fifo file
     * @returns {Promise<string>} Path to created fifo file
     */
    private async createFifo(dir: string, fifoName: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const fifoPath: string = shellescape([dir + "/" + fifoName]).replace(/\'/g, "");

            exec(`mkfifo ${fifoPath}`, async (error) => {
                if (error) {
                    // eslint-disable-next-line no-console
                    console.error(`exec error: ${error}`);
                    reject(error);
                }

                await chmod(fifoPath, 0o660);

                resolve(fifoPath);
            });
        });
    }

    /**
     * Creates fifos to be used for communication with runner.
     *
     * @param {string} controlFifo Filename for fifo file used for control stream.
     * @param {string} monitorFifo Filename for fifo file used for monitoring stream.
     * @param {string} loggerFifo Filename for fifo file used for logger stream.
     * @param {string} inputFifo Filename for fifo file used for input stream.
     * @param {string} outputFifo Filename for fifo file used for output stream.     *
     * @returns {Promise<string>} Promise resolving with directory created for fifo files.
     */
    private async createFifoStreams(
        controlFifo: string,
        monitorFifo: string,
        loggerFifo: string,
        inputFifo: string,
        outputFifo: string
    ): Promise<string> {
        const dirPrefix: string = "fifos";
        const createdDir = await mkdtemp(path.join(tmpdir(), dirPrefix));

        this.logger.log("Directory for FiFo files created: ", createdDir);

        [
            this.controlFifoPath,
            this.monitorFifoPath,
            this.loggerFifoPath,
            this.inputFifoPath,
            this.outputFifoPath
        ] = [
            path.join(createdDir, controlFifo),
            path.join(createdDir, monitorFifo),
            path.join(createdDir, loggerFifo),
            path.join(createdDir, inputFifo),
            path.join(createdDir, outputFifo)
        ];

        await Promise.all([
            this.createFifo(createdDir, controlFifo),
            this.createFifo(createdDir, monitorFifo),
            this.createFifo(createdDir, loggerFifo),
            this.createFifo(createdDir, inputFifo),
            this.createFifo(createdDir, outputFifo)
        ]);

        await chmod(createdDir, 0o750);

        return createdDir;
    }

    /**
     * Returns objects with statistics of process with running instance.
     *
     * @param {MonitoringMessageData} msg Message to be included in statistics message.
     * @returns {Promise<MonitoringMessageData>} Promise resolved with process statistics.
     */
    async stats(msg: MonitoringMessageData): Promise<MonitoringMessageData> {
        // @TODO implement stats
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

    /**
     * Sets communication channels for communication handler.
     *
     * @param {CommunicationHandler} communicationHandler Communication handler to be used for communication
     * with instance.
     */
    hookCommunicationHandler(communicationHandler: ICommunicationHandler): void {
        const downstreamStreamsConfig: DownstreamStreamsConfig = [
            this.runnerStdin,
            this.runnerStdout,
            this.runnerStderr,
            this.controlStream.getStream(),
            this.monitorStream.getStream(),
            this.inputStream.getStream(),
            this.outputStream.getStream(),
            this.loggerStream.getStream(),
        ];

        communicationHandler.hookDownstreamStreams(downstreamStreamsConfig);
    }

    /**
     * Starts Runner in process with provided configuration.
     *`
     * @param {SequenceConfiguration} config Configuration of sequence.
     * @returns {Promise<void>} Promise resolved with Runner exit code.
     */
    async run(config: SequenceConfig): Promise<ExitCode> {
        if (config.type !== "process") {
            throw new Error("Process instance adapter run with invalid runner config");
        }

        this.fifosDir = await this.createFifoStreams(
            "control.fifo",
            "monitor.fifo",
            "logger.fifo",
            "input.fifo",
            "output.fifo"
        );

        this.logger.info("Instance preparation done.");

        if (
            typeof this.monitorFifoPath === "undefined" ||
            typeof this.controlFifoPath === "undefined" ||
            typeof this.loggerFifoPath === "undefined" ||
            typeof this.inputFifoPath === "undefined" ||
            typeof this.outputFifoPath === "undefined"
        ) {
            throw new SupervisorError("SEQUENCE_RUN_BEFORE_INIT");
        }

        this.monitorStream.run(createReadStream(this.monitorFifoPath));
        this.controlStream.run(createWriteStream(this.controlFifoPath));
        this.loggerStream.run(createReadStream(this.loggerFifoPath));
        this.inputStream.run(createWriteStream(this.inputFifoPath));
        this.outputStream.run(createReadStream(this.outputFifoPath));

        this.logger.log("Starting Runner...", config.id);

        const sequencePath = path.join(
            config.sequenceDir,
            config.entrypointPath
        );

        this.logger.log("Spawning Runner process with command", runnerCommand, "and envs: ", {
            FIFOS_DIR: this.fifosDir,
            SEQUENCE_PATH: sequencePath
        });

        // @TODO support running by ts-node
        const runnerProcess = spawn(runnerCommand[0], runnerCommand.slice(1), {
            env: {
                PATH: process.env.PATH,
                DEVELOPMENT: process.env.DEVELOPMENT,
                PRODUCTION: process.env.PRODUCTION,
                FIFOS_DIR: this.fifosDir,
                SEQUENCE_PATH: sequencePath
            }
        });

        this.runnerStdin.pipe(runnerProcess.stdin);
        runnerProcess.stdout.pipe(this.runnerStdout);
        runnerProcess.stderr.pipe(this.runnerStderr);

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

    /**
     * Performs cleanup after Runner end.
     * Removes fifos used to communication with runner.
     */
    async cleanup(): Promise<void> {
        const { fifosDir } = this;

        if (!fifosDir) {
            this.logger.warn("Trying to remove fifos dir that wasn't initialized");
            return;
        }

        await rm(fifosDir, { recursive: true });
    }
    // @ts-ignore
    snapshot(): MaybePromise<string> {
        /** ignore */
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

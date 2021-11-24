import { AppConfig, ApplicationFunction, ApplicationInterface, EncodedControlMessage, EncodedMonitoringMessage, EventMessageData, HandshakeAcknowledgeMessageData, IComponent, Logger, MaybePromise, MonitoringRateMessageData, ReadableStream, StopSequenceMessageData, Streamable, SynchronousStreamable, WritableStream } from "@scramjet/types";
import { BufferStream, DataStream, StringStream } from "scramjet";
import { RunnerAppContext, RunnerProxy } from "./runner-app-context";
import { addLoggerOutput, getLogger } from "@scramjet/logger";
import { createReadStream, createWriteStream } from "fs";
import { mapToInputDataStream, readInputStreamHeaders } from "./input-stream";

import { EventEmitter } from "events";
import { MessageUtils } from "./message-utils";
import { Readable } from "stream";
/* eslint-disable no-extra-parens */
import { RunnerError } from "@scramjet/model";
import { RunnerMessageCode } from "@scramjet/symbols";
import { exec } from "child_process";

type MaybeArray<T> = T | T[];
type Primitives = string | number | boolean | void | null;

export function isNotPrimitive(obj: SynchronousStreamable<any> | Primitives) : obj is SynchronousStreamable<any> {
    return !["string", "number", "boolean", "undefined", "null"].includes(typeof obj);
}

export class Runner<X extends AppConfig> implements IComponent {
    private emitter;
    private context?: RunnerAppContext<X, any>;
    private monitoringInterval?: NodeJS.Timeout;
    private monitorStream?: WritableStream<any>; //TODO change any to EncodedMonitoringMessage
    private loggerStream?: WritableStream<string>;
    private controlStream?: ReadableStream<EncodedControlMessage>;
    private inputStream?: ReadableStream<string>; // TODO change any depend on appcontext
    private outputStream?: WritableStream<string>; // TODO change any depend on appcontext
    private outputDataStream: DataStream;
    private inputDataStream?: DataStream;
    private monitorFifoPath: string;
    private controlFifoPath: string;
    private loggerFifoPath: string;
    private inputFifoPath: string;
    private outputFifoPath: string;
    private sequencePath: string;
    private keepAliveRequested?: boolean;

    private inputResolver?: { res: Function, rej: Function };

    private stopExpected: boolean = false;

    handshakeResolver?: { res: Function, rej: Function };

    logger: Logger;

    constructor(sequencePath: string, fifosPath: string) {
        this.emitter = new EventEmitter();
        this.logger = getLogger(this);

        this.controlFifoPath = `${fifosPath}/control.fifo`;
        this.monitorFifoPath = `${fifosPath}/monitor.fifo`;
        this.loggerFifoPath = `${fifosPath}/logger.fifo`;
        this.inputFifoPath = `${fifosPath}/input.fifo`;
        this.outputFifoPath = `${fifosPath}/output.fifo`;
        this.sequencePath = sequencePath;

        this.outputDataStream = new DataStream().catch((e: any) => {
            this.logger.error("Error during output data stream.", e);
            throw e;
        });
    }

    async controlStreamHandler([code, data]: EncodedControlMessage) {
        this.logger.log("Control message received:", code, data);

        switch (code) {
        case RunnerMessageCode.MONITORING_RATE:
            await this.handleMonitoringRequest(data as MonitoringRateMessageData);
            break;
        case RunnerMessageCode.KILL:
            await this.handleKillRequest();
            break;
        case RunnerMessageCode.STOP:
            await this.addStopHandlerRequest(data as StopSequenceMessageData);
            break;
        case RunnerMessageCode.FORCE_CONFIRM_ALIVE:
            this.handleForceConfirmAliveRequest();
            break;
        case RunnerMessageCode.PONG:
            this.handshakeResolver?.res(data);
            break;
        case RunnerMessageCode.EVENT:
            const eventData = data as EventMessageData;

            this.emitter.emit(eventData.eventName, eventData.message);
            break;
        // [RunnerMessageCode.INPUT_CONTENT_TYPE, false
        case RunnerMessageCode.INPUT_CONTENT_TYPE:
            if ((data as any).connected) {
                this.inputResolver?.res(data);
            } else {
                this.inputResolver?.rej(data);
            }
            break;
        default:
            break;
        }
    }

    async hookupControlStream() {
        this.controlStream = createReadStream(this.controlFifoPath);
        this.defineControlStream();
    }

    defineControlStream() {
        StringStream
            .from(this.controlStream as Readable)
            .JSONParse()
            .each(async ([code, data]: EncodedControlMessage) => this.controlStreamHandler([code, data]))
            .run()
            .catch(async (error) => {
                this.logger.error("An error occurred during parsing control message.", error.stack);
            });
    }

    async cleanup(): Promise<number> {
        this.logger.info("Cleaning up...");

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);

            this.logger.log("Monitoring interval removed.");
        }

        try {
            this.logger.log("Cleaning up streams...");

            await this.cleanupStreams();

            this.logger.info("Streams clear.");

            return 0;
        } catch (e: any) {
            this.logger.error("Streams not clear, error.", e);

            return 233;
        } finally {
            this.logger.info("Clean up completed.");
        }
    }

    async cleanupStreams(): Promise<any> {
        return Promise.all([
            this.cleanupStream(this.controlStream, this.controlFifoPath),
            this.cleanupStream(this.inputStream, this.inputFifoPath)
        ]);
    }

    private async execCommand(cmd: string) {
        return new Promise((resolve, reject) => {
            this.logger.log("Command [ start ]", JSON.stringify(cmd));

            exec(cmd, (error) => {
                if (error) {
                    this.logger.error(error);
                    reject(error);
                }

                this.logger.log("Command [ end ]", JSON.stringify(cmd), error);
                resolve(0);
            });
        });
    }

    private async cleanupStream(stream: ReadableStream<any> | WritableStream<any> | undefined, fifo: string) {
        if (stream) {
            if ("writable" in stream) {
                stream.end();
            } else {
                stream.destroy();
            }
        }

        await this.execCommand(`echo "" > "${fifo}"`); // TODO: Shell escape
    }

    async hookupMonitorStream() {
        this.monitorStream = createWriteStream(this.monitorFifoPath);
    }

    async hookupLoggerStream() {
        this.loggerStream = createWriteStream(this.loggerFifoPath);
    }

    async hookupInputStream() {
        // @TODO handle closing and reopening input stream
        this.inputStream = createReadStream(this.inputFifoPath)!;
        this.inputDataStream = new DataStream().catch((e: any) => { this.logger.error("Error during input data stream.", e); throw e; });

        // do not await here, allow the rest of initialization in the caller to run
    }

    //readInputStreamHeaders(this.inputStream!)
    async setInputContentType(headers: any) {
        const contentType = headers["content-type"];

        this.logger.log(`Content-Type: ${contentType}`);

        mapToInputDataStream(this.inputStream!, contentType)
            .catch((error: any) => {
                this.logger.error("mapToInputDataStream", error);
                // TODO: we should be doing some error handling here:
                // TODO: remove the stream, mark as bad, kill the instance maybe?
            }).pipe(this.inputDataStream!);
    }

    async hookupOutputStream() {
        this.outputStream = createWriteStream(this.outputFifoPath);
        this.outputDataStream
            //JSONStringify()
            .pipe(this.outputStream)
        ;
    }

    async hookupFifoStreams() {
        return Promise.all([
            this.hookupControlStream(),
            this.hookupMonitorStream(),
            this.hookupInputStream(),
            this.hookupOutputStream()
        ]);
    }

    initializeLogger() {
        if (this.loggerStream) {
            addLoggerOutput(this.loggerStream);
        } else {
            throw new RunnerError("UNINITIALIZED_STREAMS", "Logger");
        }
    }

    handleForceConfirmAliveRequest() {
        this.logger.error("Method not implemented.");

        throw new Error("Method not implemented.");
    }

    async handleMonitoringRequest(data: MonitoringRateMessageData): Promise<void> {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        let working = false;

        if (this.context === undefined || this.context.monitor === undefined) {
            this.logger.error("No monitoring stream.");

            throw new RunnerError("NO_MONITORING");
        }

        this.monitoringInterval = setInterval(async () => {
            if (working) return;

            working = true;
            await this.reportHealth();
            working = false;
        }, 1000 / data.monitoringRate).unref();
    }

    private async reportHealth() {
        const { context } = this;

        if (!context) {
            // Context is not yet defined
            this.logger.warn("Undefined context while reporting health");
            return;
        }

        const { healthy } = await context.monitor();

        MessageUtils.writeMessageOnStream([RunnerMessageCode.MONITORING, { healthy }], this.monitorStream);
    }

    async handleKillRequest(): Promise<void> {
        this.logger.log("Handling KILL request...");

        this.context?.killHandler();
        await this.cleanup();

        //TODO: investigate why we need to wait (process.tick - no all logs)
        if (!this.stopExpected) {
            this.logger.log("Exiting... (unexpected, 137)");
            this.exit(137);
        } else {
            this.logger.log("Exiting... (expected)");
            this.exit();
        }
    }

    async addStopHandlerRequest(data: StopSequenceMessageData): Promise<void> {
        if (!this.context) {
            this.logger.error("Uninitialized context.");

            throw new RunnerError("UNINITIALIZED_CONTEXT");
        }

        this.keepAliveRequested = false;

        let sequenceError;

        try {
            await this.context.stopHandler(
                data.timeout,
                data.canCallKeepalive
            );
        } catch (err: any) {
            sequenceError = err;

            this.logger.error("Following error ocurred during stopping sequence: ", err);
        }

        if (!data.canCallKeepalive || !this.keepAliveRequested) {
            MessageUtils.writeMessageOnStream(
                [RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError }], this.monitorStream);

            //TODO add save, cleaning etc when implemented
        }
    }

    private keepAliveIssued(): void {
        this.keepAliveRequested = true;
    }

    private exit(exitCode?: number) {
        if (typeof exitCode !== undefined) process.exitCode = exitCode;
        // TODO: why we need this?
        setTimeout(() => process.exit());
    }

    // TODO: this should be the foll class logic
    /**
     * Initialization of runner class.
     * * initilize streams (fifo and std)
     * * send handshake (via monitor stream) to LCDA and receive an answer from LCDA (via control stream)
     */
    async main() {
        this.logger.log("Executing main..."); // TODO: this is not working (no logger yet)

        await this.hookupLoggerStream();

        this.initializeLogger();

        await this.hookupFifoStreams();

        this.logger.log("Fifo and logger initialized, sending handshake...");

        this.sendHandshakeMessage();

        const { appConfig, args } = await this.waitForHandshakeResponse();

        this.logger.log("Handshake received.");

        this.initAppContext(appConfig as X);

        if (!this.context) {
            this.logger.error("Uninitialized context.");

            throw new RunnerError("UNINITIALIZED_CONTEXT");
        }

        await this.reportHealth();
        await this.handleMonitoringRequest({ monitoringRate: 1 });

        let sequence: any[] = [];

        try {
            sequence = this.getSequence();
            this.logger.log("Sequence: ", sequence);

            if (sequence.length && typeof sequence[0] !== "function") {
                this.logger.info("First sequence object is not a function:", sequence[0]);

                MessageUtils.writeMessageOnStream(
                    [RunnerMessageCode.PANG, {
                        requires: sequence[0].requires,
                        contentType: sequence[0].contentType
                    }], this.monitorStream);

                this.logger.log("Waiting for input stream...");

                const connected = await new Promise((res, rej) => {
                    this.inputResolver = { res, rej };
                });

                if (connected) {
                    this.logger.log("Input stream connected.");

                    await this.setInputContentType({
                        "content-type": sequence[0].contentType
                    });

                    this.logger.log("Input ContentType set to", sequence[0].contentType);
                } else {
                    this.logger.log("No Input stream.");
                }

                sequence.shift();
            } else {
                MessageUtils.writeMessageOnStream(
                    [RunnerMessageCode.PANG, {
                        requires: ""
                    }], this.monitorStream);

                readInputStreamHeaders(this.inputStream!)
                    .then((headers) => this.setInputContentType(headers))
                    .catch((err) => this.logger.error("Error while reading input stream headers:", err));
            }

            this.logger.log(`Sequence loaded, functions count: ${sequence.length}.`);
        } catch (error: any) {
            if (error instanceof SyntaxError) {
                this.logger.error("Sequence syntax error.", error.stack);
            } else {
                this.logger.error("Sequence error:", error.stack);
            }

            //TODO: investigate why we need to wait
            await this.cleanup();
            this.exit(21);
        }

        try {
            /**
             * @analyze-how-to-pass-in-out-streams
             * Before we start a Sequence we should create readable and writable streams
             * to input and output.
             * In a fashion similar to how we create monitor and control streams,
             * but after the acknowledge message comes (PONG) and
             * before we start a Sequence.
             */
            await this.runSequence(sequence, args);

            this.logger.log("Sequence completed.");
        } catch (error: any) {
            this.logger.error("Error occured during sequence execution: ", error.stack);

            await this.cleanup();

            this.exit(20);
        }
    }

    /**
     * initialize app context
     * set up streams process.stdin, process.stdout, process.stderr, fifo downstream, fifo upstream
     *
     * @param config Configuration for App.
     */
    initAppContext(config: X) {
        if (this.monitorStream === undefined) {
            this.logger.error("Uninitialized monitoring stream.");

            throw new RunnerError("UNINITIALIZED_STREAMS", "Monitoring");
        }

        const runner: RunnerProxy = {
            keepAliveIssued: () => this.keepAliveIssued(),
            sendStop: (err?: Error) => {
                this.writeMonitoringMessage([RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError: err }]);
                this.stopExpected = true;
            },
            sendKeepAlive: (ev) => this.writeMonitoringMessage([RunnerMessageCode.ALIVE, ev]),
            sendEvent: (ev) => this.writeMonitoringMessage([RunnerMessageCode.EVENT, ev])
        };

        this.context = new RunnerAppContext(config, this.monitorStream, this.emitter, runner);

        this.handleSequenceEvents();
    }

    private writeMonitoringMessage(encodedMonitoringMessage: EncodedMonitoringMessage) {
        MessageUtils.writeMessageOnStream(encodedMonitoringMessage, this.monitorStream);
        // TODO: what if it fails?
    }

    sendHandshakeMessage() {
        this.logger.log("Sending handshake.");

        MessageUtils.writeMessageOnStream([RunnerMessageCode.PING, {}], this.monitorStream);
    }

    async waitForHandshakeResponse(): Promise<HandshakeAcknowledgeMessageData> {
        return new Promise<HandshakeAcknowledgeMessageData>((res, rej) => {
            this.handshakeResolver = { res, rej };
        });
    }

    getSequence(): ApplicationInterface[] {
        /* eslint-disable-next-line import/no-dynamic-require */
        const sequenceFromFile = require(this.sequencePath);
        const _sequence: MaybeArray<ApplicationFunction> =
            Object.prototype.hasOwnProperty.call(sequenceFromFile, "default")
                ? sequenceFromFile.default
                : sequenceFromFile;

        return Array.isArray(_sequence) ? _sequence : [_sequence];
    }

    /**
     * run sequence
     *
     * @param args {any[]} arguments that the app will be called with
     */
    // eslint-disable-next-line complexity
    async runSequence(sequence: any[], args: any[] = []): Promise<void> {
        if (!sequence.length) {
            await this.cleanup();
            this.logger.error("Empty sequence.");

            //TODO: investigate why we need to wait
            this.exit(22);

            return;
        }

        /**
         * @analyze-how-to-pass-in-out-streams
         * Output stream will be returned from the Sequence:
         * await const outputStream = sequence.call(..);
         * This outputStreams needs to be piped to the
         * local Runner property outputStream (named fifo pipe).
         *
         * Pass the input stream to stream instead of creating new DataStream();
         */
        let stream: DataStream | void = this.inputDataStream ||
            DataStream.from([]).catch((e: any) => { this.logger.error(e); });
        let itemsLeftInSequence = sequence.length;
        let intermediate: SynchronousStreamable<any> | void = stream;

        for (const func of sequence) {
            itemsLeftInSequence--;

            let out: MaybePromise<Streamable<any> | void>;

            try {
                this.logger.log(`Processing function on index: ${sequence.length - itemsLeftInSequence - 1}.`);

                out = func.call(
                    this.context,
                    stream,
                    ...args
                );

                this.logger.log(`Function on index: ${sequence.length - itemsLeftInSequence - 1} called.`);
            } catch (error: any) {
                this.logger.error(`Sequence error (function index ${sequence.length - itemsLeftInSequence})`, error.stack);

                throw new RunnerError("SEQUENCE_RUNTIME_ERROR");
            }

            if (itemsLeftInSequence > 0) {
                intermediate = await out;

                this.logger.info(`Sequence at ${sequence.length - itemsLeftInSequence - 1} output type ${typeof out}`);

                if (!intermediate) {
                    this.logger.error("Sequence ended premature");

                    throw new RunnerError("SEQUENCE_ENDED_PREMATURE");
                } else if (typeof intermediate === "object" && intermediate instanceof DataStream) {
                    this.logger.debug(`Sequence function ${sequence.length - itemsLeftInSequence - 1} returned DataStream.`);
                    stream = intermediate;
                } else {
                    this.logger.debug(`Sequence function ${sequence.length - itemsLeftInSequence - 1} returned readable.`);

                    // TODO: what if this is not a DataStream, but BufferStream stream!!!!
                    stream = DataStream.from(intermediate as Readable);
                }
            } else {
                this.logger.info("All sequences processed.");

                intermediate = await out;

                if (intermediate instanceof DataStream) {
                    stream = intermediate;
                } else if (intermediate !== undefined && isNotPrimitive(intermediate)) {
                    stream = DataStream.from(intermediate as Readable)
                        .catch((e: any) => { this.logger.error(e); throw e; });
                } else {
                    stream = undefined;
                }

                this.logger.debug(`Stream type is ${typeof stream}`);
            }
        }

        /**
         * @analyze-how-to-pass-in-out-streams
         * We need to make sure to close input and output streams
         * after Sequence terminates.
         *
         * pipe the last `stream` value to output stream
         * unless there is NO LAST STREAM
         */
        if (!isNotPrimitive(intermediate)) {
            this.logger.info("Primitive returned as last value");

            this.outputStream?.end(`${intermediate}`);

            MessageUtils.writeMessageOnStream(
                [RunnerMessageCode.PANG, {
                    provides: "",
                    contentType: ""
                }],
                this.monitorStream
            );

            this.endRunner();
        } else if (stream && this.outputStream && this.outputDataStream) {
            this.logger.log(`Piping sequence output (type ${typeof stream}).`);

            stream
                .once("end", () => {
                    this.logger.info("Sequence stream ended.");
                    this.endRunner();
                })
                .pipe(
                    stream instanceof StringStream || stream instanceof BufferStream
                        ? this.outputStream
                        : this.outputDataStream
                );

            MessageUtils.writeMessageOnStream(
                [RunnerMessageCode.PANG, {
                    provides: intermediate.topic || "",
                    contentType: intermediate.contentType || ""
                }],
                this.monitorStream
            );
        } else {
            // TODO: this should push a PANG message with the sequence description
            this.logger.info("Sequence did not output a stream.");
            this.endRunner();
        }
    }

    private endRunner() {
        this.writeMonitoringMessage([RunnerMessageCode.SEQUENCE_COMPLETED, {}]);
        this.stopExpected = true;
    }

    handleSequenceEvents() {
        this.emitter.on("error", (e) => {
            this.logger.error("Sequence emitted an error event", e);
        });
    }
}

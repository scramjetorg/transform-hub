import {
    AppConfig,
    ApplicationFunction,
    ApplicationInterface,
    EncodedControlMessage,
    EncodedMonitoringMessage,
    EventMessageData,
    HandshakeAcknowledgeMessageData,
    IComponent,
    ICSHClient,
    Logger,
    MaybePromise,
    MonitoringRateMessageData,
    StopSequenceMessageData,
    Streamable,
    SynchronousStreamable,
    HasTopicInformation
} from "@scramjet/types";
import { BufferStream, DataStream, StringStream } from "scramjet";
import { RunnerAppContext, RunnerProxy } from "./runner-app-context";
import { addLoggerOutput, getLogger } from "@scramjet/logger";
import { mapToInputDataStream, readInputStreamHeaders } from "./input-stream";

import { EventEmitter } from "events";
import { MessageUtils } from "./message-utils";
import { Readable } from "stream";
/* eslint-disable no-extra-parens */
import { RunnerError } from "@scramjet/model";
import { RunnerMessageCode } from "@scramjet/symbols";
import { defer } from "@scramjet/utility";
import { createWriteStream } from "fs";

type MaybeArray<T> = T | T[];
type Primitives = string | number | boolean | void | null;

export function isSynchronousStreamable(obj: SynchronousStreamable<any> | Primitives):
    obj is SynchronousStreamable<any> {
    return !["string", "number", "boolean", "undefined", "null"].includes(typeof obj);
}

const exitDelay = 5000;

function hookStdout(callback: any) {
    const oldWrite = process.stdout.write;

    // @ts-ignore
    process.stdout.write = (function(write) {
        return function(string, encoding, fd) {
            write.apply(process.stdout, [string, encoding, fd]);
            return callback(string, encoding, fd);
        };
    })(process.stdout.write);

    return function() {
        process.stdout.write = oldWrite;
    };
}

function hookStderr(callback: any) {
    const oldWrite = process.stderr.write;

    // @ts-ignore
    process.stderr.write = (function(write) {
        return function(string, encoding, fd) {
            write.apply(process.stderr, [string, encoding, fd]);
            return callback(string, encoding, fd);
        };
    })(process.stderr.write);

    return function() {
        process.stderr.write = oldWrite;
    };
}

export class Runner<X extends AppConfig> implements IComponent {
    private emitter;
    private context?: RunnerAppContext<X, any>;
    private monitoringInterval?: NodeJS.Timeout;
    private keepAliveRequested?: boolean;

    private inputResolver?: { res: Function, rej: Function };

    private stopExpected: boolean = false;

    handshakeResolver?: { res: Function, rej: Function };

    logger: Logger;

    private inputDataStream: DataStream
    private outputDataStream: DataStream

    constructor(
        private sequencePath: string,
        private hostClient: ICSHClient,
        private instanceId: string
    ) {
        this.emitter = new EventEmitter();
        this.logger = getLogger(this);
        this.inputDataStream = new DataStream().catch((e: any) => {
            this.logger.error("Error during input data stream.", e);
            throw e;
        });
        this.outputDataStream = new DataStream().catch((e: any) => {
            this.logger.error("Error during input data stream.", e);
            throw e;
        });

        addLoggerOutput(createWriteStream("runner-error"));
        this.logger.log("HELLO LOGGER");
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

    defineControlStream() {
        StringStream
            .from(this.hostClient.controlStream)
            .JSONParse()
            .each(async ([code, data]: EncodedControlMessage) => this.controlStreamHandler([code, data]))
            .on("error", (error) => {
                this.logger.error("An error occurred during parsing control message.", error);
            });
    }

    async cleanup(): Promise<number> {
        this.logger.info("Cleaning up...");
        await defer(1000);

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);

            this.logger.log("Monitoring interval removed.");
        }

        try {
            this.logger.log("Cleaning up streams...");
            await this.hostClient.disconnect();

            this.logger.info("Streams clear.");

            return 0;
        } catch (e: any) {
            this.logger.error("Streams not clear, error.", e);

            return 233;
        } finally {
            this.logger.info("Clean up completed.");
        }
    }

    async setInputContentType(headers: any) {
        const contentType = headers["content-type"];

        this.logger.log(`Content-Type: ${contentType}`);

        mapToInputDataStream(this.hostClient.inputStream, contentType)
            .catch((error: any) => {
                this.logger.error("mapToInputDataStream", error);
                // TODO: we should be doing some error handling here:
                // TODO: remove the stream, mark as bad, kill the instance maybe?
            }).pipe(this.inputDataStream);
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

        MessageUtils.writeMessageOnStream(
            [RunnerMessageCode.MONITORING, { healthy }], this.hostClient.monitorStream
        );
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
                [RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError }], this.hostClient.monitorStream);

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

        await this.hostClient.init(this.instanceId);

        // @TODO handle it properly!!!!!!!
        process.on("exit", (err) => {
            this.logger.error("EXITTTING!!!", err);
        });
        process.on("uncaughtException", (err) => {
            this.logger.error("EXCEPTION!!!", err);
        });
        process.on("unhandledRejection", (err) => {
            this.logger.error("REJECTION!!!", err);
        });

        try {
            addLoggerOutput(this.hostClient.logStream);
            this.logger.log("Logs connected");

            this.logger.log("=== CONTROL");

            this.defineControlStream();

            this.logger.log("=== STDIN");

            // @TODO handle stdio piping
            this.hostClient.stdinStream.on("data", (chunk) => {
                this.logger.log("INCOMING stdin: " + chunk);
                process.stdin.unshift(chunk);
            });
            this.hostClient.stdinStream.on("end", () => {
                process.stdin.end();
            });

            this.logger.log("=== STDOUT");

            hookStdout((chunk: any) => this.hostClient.stdoutStream.write(chunk));
            this.hostClient.stdoutStream.on("drain", () => {
                process.stdout.emit("drain");
            });

            this.logger.log("=== STDERR");
            hookStderr((chunk: any) => this.hostClient.stderrStream.write(chunk));
            this.hostClient.stderrStream.on("drain", () => {
                process.stderr.emit("drain");
            });

            this.logger.log("=== OUTPUT");
            this.outputDataStream.JSONStringify().pipe(this.hostClient.outputStream);
        } catch (err) {
            this.logger.error("Init stream", err);
        }

        this.logger.log("Host client and logger initialized, sending handshake...");

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
                    }], this.hostClient.monitorStream);

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
                    }], this.hostClient.monitorStream);

                readInputStreamHeaders(this.hostClient.inputStream)
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

            this.logger.log(`Sequence completed. Waiting ${exitDelay}ms with exit.`);

            await defer(exitDelay);
        } catch (error: any) {
            this.logger.error("Error occured during sequence execution: ", error.stack);

            await this.cleanup();

            this.exit(20);
        }

        await this.cleanup();
        this.exit(0);
    }

    /**
     * initialize app context
     * set up streams process.stdin, process.stdout, process.stderr, fifo downstream, fifo upstream
     *
     * @param config Configuration for App.
     */
    initAppContext(config: X) {
        const runner: RunnerProxy = {
            keepAliveIssued: () => this.keepAliveIssued(),
            sendStop: (err?: Error) => {
                this.writeMonitoringMessage([RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError: err }]);
                this.stopExpected = true;
            },
            sendKeepAlive: (ev) => this.writeMonitoringMessage([RunnerMessageCode.ALIVE, ev]),
            sendEvent: (ev) => this.writeMonitoringMessage([RunnerMessageCode.EVENT, ev])
        };

        this.context = new RunnerAppContext(config, this.hostClient.monitorStream, this.emitter, runner);

        this.handleSequenceEvents();
    }

    private writeMonitoringMessage(encodedMonitoringMessage: EncodedMonitoringMessage) {
        MessageUtils.writeMessageOnStream(encodedMonitoringMessage, this.hostClient.monitorStream);
        // TODO: what if it fails?
    }

    sendHandshakeMessage() {
        this.logger.log("Sending handshake.");

        MessageUtils.writeMessageOnStream([RunnerMessageCode.PING, {}], this.hostClient.monitorStream);
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
        let stream: Readable & HasTopicInformation | void = this.inputDataStream;
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

                if (intermediate instanceof Readable) {
                    stream = intermediate;
                } else if (intermediate !== undefined && isSynchronousStreamable(intermediate)) {
                    stream = Object.assign(DataStream.from(intermediate as Readable), {
                        topic: intermediate.topic,
                        contentType: intermediate.contentType
                    });
                } else {
                    stream = undefined;
                }

                this.logger.debug(`Stream type is ${typeof stream}`);
            }
        }

        // @TODO handle errors
        // eslint-disable-next-line complexity
        await new Promise<void>((res) => {
            /**
         * @analyze-how-to-pass-in-out-streams
         * We need to make sure to close input and output streams
         * after Sequence terminates.
         *
         * pipe the last `stream` value to output stream
         * unless there is NO LAST STREAM
         */
            if (!isSynchronousStreamable(intermediate)) {
                this.logger.info("Primitive returned as last value");

                this.hostClient.outputStream.end(`${intermediate}`);

                MessageUtils.writeMessageOnStream(
                    [RunnerMessageCode.PANG, {
                        provides: "",
                        contentType: ""
                    }],
                    this.hostClient.monitorStream,
                );

                res();
            } else if (stream && this.hostClient.outputStream) {
                this.logger.log(`Piping sequence output (type ${typeof stream}).`);

                const shouldSerialize = stream.contentType &&
                ["application/x-ndjson", "text/x-ndjson"].includes(stream.contentType) ||
                stream instanceof DataStream && !(
                    stream instanceof StringStream || stream instanceof BufferStream
                );

                stream
                    .once("end", () => {
                        this.logger.info("Sequence stream ended.");
                        res();
                    })
                    .pipe(shouldSerialize
                        ? this.outputDataStream
                        : this.hostClient.outputStream
                    );

                MessageUtils.writeMessageOnStream(
                    [RunnerMessageCode.PANG, {
                        provides: intermediate.topic || "",
                        contentType: intermediate.contentType || ""
                    }],
                    this.hostClient.monitorStream,
                );
            } else {
            // TODO: this should push a PANG message with the sequence description
                this.logger.info("Sequence did not output a stream.");
                res();
            }
        });
    }

    handleSequenceEvents() {
        this.emitter.on("error", (e) => {
            this.logger.error("Sequence emitted an error event", e);
        });
    }
}

import {
    AppConfig,
    ApplicationFunction,
    ApplicationInterface,
    EncodedControlMessage,
    EncodedMonitoringMessage,
    EventMessageData,
    HandshakeAcknowledgeMessageData,
    IComponent,
    IHostClient,
    Logger,
    MaybePromise,
    MonitoringRateMessageData,
    StopSequenceMessageData,
    Streamable,
    SynchronousStreamable,
    HasTopicInformation,
    IObjectLogger
} from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
import { RunnerError } from "@scramjet/model";
import { ObjLogger } from "@scramjet/obj-logger";
import { RunnerMessageCode } from "@scramjet/symbols";
import { defer } from "@scramjet/utility";

import { BufferStream, DataStream, StringStream } from "scramjet";

import { EventEmitter } from "events";
import { Readable, Writable } from "stream";

import { RunnerAppContext, RunnerProxy } from "./runner-app-context";
import { mapToInputDataStream, readInputStreamHeaders } from "./input-stream";
import { MessageUtils } from "./message-utils";

type MaybeArray<T> = T | T[];
type Primitives = string | number | boolean | void | null;

export function isSynchronousStreamable(obj: SynchronousStreamable<any> | Primitives):
    obj is SynchronousStreamable<any> {
    return !["string", "number", "boolean", "undefined", "null"].includes(typeof obj);
}

// @TODO make this a parameter, we could be extending that bc our CLI tests execute commands slow, even ~3s/command
const exitDelay = 10000;

function overrideStandardStream(oldStream: Writable, newStream: Writable) {
    oldStream.write = newStream.write.bind(newStream);

    newStream.on("drain", () => {
        oldStream.emit("drain");
    });

    newStream.on("error", () => {
        oldStream.emit("error");
    });
}

/**
 * Runtime environment for sequence code.
 * Communicates with Host with data transfered to/from sequence, health info,
 * reacts to control messages such as stopping etc.
 */
export class Runner<X extends AppConfig> implements IComponent {
    private emitter;
    private _context?: RunnerAppContext<X, any>;
    private monitoringInterval?: NodeJS.Timeout;
    private keepAliveRequested?: boolean;

    private inputResolver?: { res: Function, rej: Function };

    private stopExpected: boolean = false;

    handshakeResolver?: { res: Function, rej: Function };

    logger: Logger;
    objLogger: IObjectLogger;

    private inputDataStream: DataStream
    private outputDataStream: DataStream

    constructor(
        private sequencePath: string,
        private hostClient: IHostClient,
        private instanceId: string
    ) {
        this.emitter = new EventEmitter();
        this.logger = getLogger(this);

        this.objLogger = new ObjLogger(this, { id: instanceId });

        this.inputDataStream = new DataStream().catch((e: any) => {
            this.logger.error("Error during input data stream.", e);
            this.objLogger.error("Error during input data stream", e);

            throw e;
        });

        this.outputDataStream = new DataStream().catch((e: any) => {
            this.logger.error("Error during input data stream.", e);
            this.objLogger.error("Error during input data stream", e);

            throw e;
        });
    }

    get context(): RunnerAppContext<X, any> {
        if (!this._context) {
            this.logger.error("Uninitialized context.");
            this.objLogger.error("Uninitialized context");

            throw new RunnerError("UNINITIALIZED_CONTEXT");
        }

        return this._context;
    }

    async controlStreamHandler([code, data]: EncodedControlMessage) {
        this.logger.log("Control message received:", code, data);
        this.objLogger.debug("Control message received", code, data);

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
                this.objLogger.error("Error parsing control message", error);
            });
    }

    async cleanup(): Promise<number> {
        this.logger.info("Cleaning up...");
        this.objLogger.info("Cleaning up");

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.logger.log("Monitoring interval removed.");
            this.objLogger.trace("Monitoring interval removed");
        }

        try {
            this.logger.log("Cleaning up streams...");
            this.objLogger.info("Cleaning up streams");

            await this.hostClient.disconnect();

            this.logger.info("Streams clear.");
            this.objLogger.info("Streams clear");

            return 0;
        } catch (e: any) {
            this.logger.error("Streams not clear, error.", e);
            this.objLogger.error("Error. Streams not clear", e);

            return 233;
        } finally {
            this.logger.info("Clean up completed.");
            this.objLogger.info("Clean up completed");
        }
    }

    async setInputContentType(headers: any) {
        const contentType = headers["content-type"];

        this.logger.log(`Content-Type: ${contentType}`);
        this.objLogger.debug("Content-Type", contentType);

        mapToInputDataStream(this.hostClient.inputStream, contentType)
            .catch((error: any) => {
                this.logger.error("mapToInputDataStream", error);
                this.objLogger.error("mapToInputDataStream", error);
                // TODO: we should be doing some error handling here:
                // TODO: remove the stream, mark as bad, kill the instance maybe?
            }).pipe(this.inputDataStream);
    }

    async handleMonitoringRequest(data: MonitoringRateMessageData): Promise<void> {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        let working = false;

        this.monitoringInterval = setInterval(async () => {
            if (working) {
                return;
            }

            working = true;
            await this.reportHealth();
            working = false;
        }, 1000 / data.monitoringRate).unref();
    }

    private async reportHealth() {
        const { healthy } = await this.context.monitor();

        MessageUtils.writeMessageOnStream(
            [RunnerMessageCode.MONITORING, { healthy }], this.hostClient.monitorStream
        );
    }

    async handleKillRequest(): Promise<void> {
        this.logger.log("Handling KILL request...");
        this.objLogger.debug("Handling KILL request");

        this.context.killHandler();
        await this.cleanup();

        //TODO: investigate why we need to wait (process.tick - no all logs)
        if (!this.stopExpected) {
            this.logger.log("Exiting... (unexpected, 137)");
            this.objLogger.trace("Exiting (unexpected, 137)");
            this.exit(137);
        } else {
            this.logger.log("Exiting... (expected)");
            this.objLogger.trace("Exiting (expected)");
            this.exit();
        }
    }

    async addStopHandlerRequest(data: StopSequenceMessageData): Promise<void> {
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
            this.logger.error("Error stopping sequence", err);
        }

        if (!data.canCallKeepalive || !this.keepAliveRequested) {
            MessageUtils.writeMessageOnStream(
                [RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError }], this.hostClient.monitorStream
            );
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

    async main() {
        await this.hostClient.init(this.instanceId);

        //addLoggerOutput(this.hostClient.logStream);
        this.objLogger.pipe(this.hostClient.logStream, { stringified: true });

        this.defineControlStream();

        this.hostClient.stdinStream
            .on("data", (chunk) => {
                process.stdin.unshift(chunk);
            })
            .on("end", () => {
                process.stdin.emit("end");
            });

        overrideStandardStream(process.stdout, this.hostClient.stdoutStream);
        overrideStandardStream(process.stderr, this.hostClient.stderrStream);

        this.outputDataStream.JSONStringify().pipe(this.hostClient.outputStream);

        this.logger.log("Streams initialized, sending handshake...");
        this.objLogger.debug("Streams initialized");

        this.sendHandshakeMessage();

        const { appConfig, args } = await this.waitForHandshakeResponse();

        this.logger.log("Handshake received.");
        this.objLogger.debug("Handshake received");

        this.initAppContext(appConfig as X);

        await this.reportHealth();
        await this.handleMonitoringRequest({ monitoringRate: 1 });

        let sequence: any[] = [];

        try {
            sequence = this.getSequence();
            this.logger.log("Sequence: ", sequence);
            this.objLogger.debug("Sequence", sequence);

            if (sequence.length && typeof sequence[0] !== "function") {
                this.logger.info("First sequence object is not a function:", sequence[0]);
                this.objLogger.debug("First sequence object is not a function:", sequence[0]);

                MessageUtils.writeMessageOnStream(
                    [RunnerMessageCode.PANG, {
                        requires: sequence[0].requires,
                        contentType: sequence[0].contentType
                    }], this.hostClient.monitorStream);

                this.logger.log("Waiting for input stream...");
                this.objLogger.trace("Waiting for input stream");

                const connected = await new Promise((res, rej) => {
                    this.inputResolver = { res, rej };
                });

                if (connected) {
                    this.logger.log("Input stream connected.");
                    this.objLogger.trace("Input stream connected");

                    await this.setInputContentType({
                        "content-type": sequence[0].contentType
                    });

                    this.logger.log("Input ContentType set to", sequence[0].contentType);
                    this.objLogger.debug("Input ContentType", sequence[0].contentType);
                } else {
                    this.logger.log("No Input stream.");
                    this.objLogger.debug("No Input stream");
                }

                sequence.shift();
            } else {
                MessageUtils.writeMessageOnStream(
                    [RunnerMessageCode.PANG, {
                        requires: ""
                    }], this.hostClient.monitorStream);

                readInputStreamHeaders(this.hostClient.inputStream)
                    .then((headers) => this.setInputContentType(headers))
                    .catch((err) => {
                        this.logger.error("Error while reading input stream headers:", err);
                        this.objLogger.error("Error while reading input stream headers:", err);
                    });
            }

            this.logger.log(`Sequence loaded, functions count: ${sequence.length}.`);
            this.objLogger.info("Sequence loaded, functions count", sequence.length);
        } catch (error: any) {
            if (error instanceof SyntaxError) {
                this.logger.error("Sequence syntax error.", error.stack);
                this.objLogger.error("Sequence syntax error.", error.stack);
            } else {
                this.logger.error("Sequence error:", error.stack);
                this.objLogger.error("Sequence error:", error.stack);
            }

            //TODO: investigate why we need to wait
            await this.cleanup();
            this.exit(21);
        }

        try {
            await this.runSequence(sequence, args);

            this.logger.log(`Sequence completed. Waiting ${exitDelay}ms with exit.`);
            this.objLogger.trace(`Sequence completed. Waiting ${exitDelay}ms with exit.`);

            await defer(exitDelay); // @TODO: investigate why we need to wait
        } catch (error: any) {
            this.logger.error("Error occured during sequence execution: ", error.stack);
            this.objLogger.error("Error occured during sequence execution: ", error.stack);

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

        this._context = new RunnerAppContext(config, this.hostClient.monitorStream, this.emitter, runner);

        this.handleSequenceEvents();
    }

    private writeMonitoringMessage(encodedMonitoringMessage: EncodedMonitoringMessage) {
        MessageUtils.writeMessageOnStream(encodedMonitoringMessage, this.hostClient.monitorStream);
        // TODO: what if it fails?
    }

    sendHandshakeMessage() {
        this.logger.log("Sending handshake.");

        MessageUtils.writeMessageOnStream([RunnerMessageCode.PING, {}], this.hostClient.monitorStream);

        this.objLogger.trace("Handshake sent");
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

    // eslint-disable-next-line complexity
    async runSequence(sequence: any[], args: any[] = []): Promise<void> {
        if (!sequence.length) {
            await this.cleanup();
            this.logger.error("Empty sequence.");
            this.objLogger.error("Empty sequence");

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
                this.objLogger.debug("Processing function on index", sequence.length - itemsLeftInSequence - 1);

                out = func.call(
                    this.context,
                    stream,
                    ...args
                );

                this.logger.log(`Function on index: ${sequence.length - itemsLeftInSequence - 1} called.`);
                this.logger.debug("Function called", sequence.length - itemsLeftInSequence - 1);
            } catch (error: any) {
                this.logger.error(`Sequence error (function index ${sequence.length - itemsLeftInSequence})`, error.stack);
                this.objLogger.error("Function errored", sequence.length - itemsLeftInSequence, error.stack);

                throw new RunnerError("SEQUENCE_RUNTIME_ERROR");
            }

            if (itemsLeftInSequence > 0) {
                intermediate = await out;

                this.logger.info(`Sequence at ${sequence.length - itemsLeftInSequence - 1} output type ${typeof out}`);
                this.objLogger.info("Function output type", sequence.length - itemsLeftInSequence - 1, typeof out);
                if (!intermediate) {
                    this.logger.error("Sequence ended premature");
                    this.objLogger.error("Sequence ended premature");

                    throw new RunnerError("SEQUENCE_ENDED_PREMATURE");
                } else if (typeof intermediate === "object" && intermediate instanceof DataStream) {
                    this.logger.debug(`Sequence function ${sequence.length - itemsLeftInSequence - 1} returned DataStream.`);
                    this.objLogger.debug("Sequence function returned DataStream.", sequence.length - itemsLeftInSequence - 1);

                    stream = intermediate;
                } else {
                    this.logger.debug(`Sequence function ${sequence.length - itemsLeftInSequence - 1} returned readable.`);
                    this.objLogger.debug("Sequence function returned readable", sequence.length - itemsLeftInSequence - 1);
                    // TODO: what if this is not a DataStream, but BufferStream stream!!!!
                    stream = DataStream.from(intermediate as Readable);
                }
            } else {
                this.logger.info("All sequences processed.");
                this.objLogger.info("All sequences processed.");

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
                this.objLogger.debug("Stream type is", typeof stream);
            }
        }

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
                this.objLogger.info("Primitive returned as last value");

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
                this.logger.log("Piping sequence output", typeof stream);

                const shouldSerialize = stream.contentType &&
                ["application/x-ndjson", "text/x-ndjson"].includes(stream.contentType) ||
                stream instanceof DataStream && !(
                    stream instanceof StringStream || stream instanceof BufferStream
                );

                stream
                    .once("end", () => {
                        this.logger.info("Sequence stream ended.");
                        this.objLogger.debug("Sequence stream ended");
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
                this.logger.debug("Sequence did not output a stream");
                res();
            }
        });
    }

    handleSequenceEvents() {
        this.emitter.on("error", (e) => {
            this.logger.error("Sequence emitted an error event", e);
            this.objLogger.error("Sequence emitted an error event", e);
        });
    }
}

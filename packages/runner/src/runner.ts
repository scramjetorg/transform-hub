/* eslint-disable no-extra-parens */
import { RunnerError } from "@scramjet/model";
import { ApplicationFunction, ApplicationInterface, EventMessageData, HandshakeAcknowledgeMessageData, IComponent, ReadableStream, WritableStream, AppConfig, EncodedControlMessage, SynchronousStreamable, Streamable, Logger, EncodedMonitoringMessage, MaybePromise, MonitoringMessageData, MonitoringRateMessageData, StopSequenceMessageData } from "@scramjet/types";
import { addLoggerOutput, getLogger } from "@scramjet/logger";
import { RunnerMessageCode } from "@scramjet/symbols";

import { BufferStream, DataStream, StringStream } from "scramjet";
import { EventEmitter } from "events";
import { Readable } from "stream";
import { createReadStream, createWriteStream } from "fs";
import { RunnerAppContext, RunnerProxy } from "./runner-app-context";
import { MessageUtils } from "./message-utils";
import { exec } from "child_process";

type MaybeArray<T> = T | T[];

const isPrimitive = (obj: any) => ["string", "number", "boolean"].includes(typeof obj);


export function loopStream<T extends unknown>(
    stream: Readable,
    iter: (chunk: Buffer) => { action: "continue" } | { action: "end", data: T, unconsumedData?: Buffer }
): Promise<T> {
    return new Promise((res, rej) => {
        const onReadable = () => {
            let chunk;

            while ((chunk = stream.read()) !== null) {
                const result = iter(chunk);

                if (result.action === "continue") {
                    continue;
                }

                stream.off("error", rej);
                stream.off("readable", onReadable);
                if (result.unconsumedData?.length) {
                    stream.unshift(result.unconsumedData);
                }

                res(result.data);
                break;
            }
        };

        stream.on("error", rej);
        stream.on("readable", onReadable);
    });
}

/**
 *
 * @param stream
 * @returns object with header key/values (header names are lower case)
 */
function readInputStreamHeaders(stream: Readable): Promise<Record<string, string>> {
    const HEADERS_ENDING_SEQ = "\r\n\r\n";

    let buffer = "";

    return loopStream<Record<string, string>>(stream, (chunk) => {
        const str = chunk.toString("utf-8");

        buffer += str;
        const headEndSeqIndex = buffer.indexOf(HEADERS_ENDING_SEQ);

        if (headEndSeqIndex === -1) {
            return { action: "continue" };
        }
        const rawHeaders = buffer.slice(0, headEndSeqIndex);
        const bodyBeginning = buffer.slice(headEndSeqIndex + HEADERS_ENDING_SEQ.length);
        const headersMap: Record<string, string> = rawHeaders
            .split("\r\n")
            .map(headerStr => headerStr.split(": "))
            .reduce((obj, [key, val]) => ({ ...obj, [key.toLowerCase()]: val }), {});


        return { action: "end", data: headersMap, unconsumedData: Buffer.from(bodyBeginning, "utf8") };
    });
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
    private outputDataStream: DataStream = new DataStream();
    private inputDataStream?: DataStream;
    private monitorFifoPath: string;
    private controlFifoPath: string;
    private loggerFifoPath: string;
    private inputFifoPath: string;
    private outputFifoPath: string;
    private sequencePath: string;
    private keepAliveRequested?: boolean;

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

    async cleanup(): Promise<void> {
        return new Promise(async (resolve) => {
            this.logger.info("Cleaning up...");

            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);

                this.logger.info("Monitoring interval removed.");
            }

            await new Promise(async (res) => {
                try {
                    this.logger.info("Cleaning up streams...");

                    await this.cleanupStreams();

                    this.logger.info("Streams clear.");

                    res(0);
                } catch (e) {
                    this.logger.error("Streams not clear, error.", e);

                    res(233);
                }
            });

            this.logger.info("Clean up completed!");

            resolve();
        });
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
        this.logger.log("Input stream HELLo");
        try {

            this.inputStream = createReadStream(this.inputFifoPath)!;
            const headers = await readInputStreamHeaders(this.inputStream);
            const contentType = headers["content-type"];

            if (contentType === undefined) {
                throw new Error("Content-Type is undefined");
            }

            this.logger.log(`Content-Type: ${contentType}`);

            if (contentType.endsWith("x-ndjson")) {
                this.inputDataStream = StringStream
                    .from(this.inputStream, { encoding: "utf-8" })
                    .JSONParse(true);
            } else if (contentType === "text/plain") {
                this.inputDataStream = StringStream.from(this.inputStream, { encoding: "utf-8" });
            } else if (contentType === "application/octet-stream") {
                this.inputDataStream = BufferStream.from(this.inputStream);
            } else {
                throw new Error(`Content-Type does not match any supported value. The actual value is ${contentType}`);
            }
        } catch (e) {
            this.logger.error("Error in input stream");
            this.logger.error(e);
        }
    }

    // echo -e '{"abc":1}\n{"abc":2}\n' | curl -v --data-binary "@-" -H "Content-Type: text/x-ndjson" "http://localhost:8000/api/v1/instance/$INSTANCE_ID/input"

    async hookupOutputStream() {
        this.outputStream = createWriteStream(this.outputFifoPath);
        this.outputDataStream
            .JSONStringify()
            .pipe(this.outputStream)
        ;
    }

    async hookupFifoStreams() {
        // @TODO bring it back to normal
        await this.hookupLoggerStream();
        this.initializeLogger();
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
        const message: MonitoringMessageData = await this.context?.monitor() || { healthy: true };

        MessageUtils.writeMessageOnStream([RunnerMessageCode.MONITORING, message], this.monitorStream);
    }

    async handleKillRequest(): Promise<void> {
        this.logger.log("Handling KILL request...");

        this.context?.killHandler();
        await this.cleanup();

        this.logger.log("Exiting ...");

        //TODO: investigate why we need to wait (process.tick - no all logs)
        if (!this.stopExpected) {
            this.exit(137);
        } else {
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
            await this.context?.stopHandler?.call(this.context,
                data.timeout,
                data.canCallKeepalive
            );
        } catch (err) {
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

        await this.hookupFifoStreams();
        // this.initializeLogger();

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

            this.logger.log(`Sequence loaded, functions count: ${sequence.length}.`);
        } catch (error) {
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
        } catch (error) {
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
                this.writeMonitoringMessage([RunnerMessageCode.SEQUENCE_STOPPED, { err }]);
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
        this.logger.info("Sending handshake.");

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
            sequenceFromFile.hasOwnProperty("default") ? sequenceFromFile.default : sequenceFromFile;

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
        let stream: DataStream | void = this.inputDataStream || DataStream.from([]);
        let itemsLeftInSequence = sequence.length;
        let intermediate: SynchronousStreamable<any> | void = stream;

        for (const func of sequence) {
            itemsLeftInSequence--;

            let out: MaybePromise<Streamable<any> | void>;

            try {
                this.logger.info(`Processing function on index: ${sequence.length - itemsLeftInSequence - 1}`);

                out = func.call(
                    this.context,
                    intermediate as unknown as ReadableStream<any>,
                    ...args
                );

                this.logger.info(`Function on index: ${sequence.length - itemsLeftInSequence - 1} called.`);
            } catch (error) {
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
                    this.logger.debug(`Sequence function ${sequence.length - itemsLeftInSequence - 1} returned DataStream`);
                    stream = intermediate;
                } else {
                    this.logger.debug(`Sequence function ${sequence.length - itemsLeftInSequence - 1} returned readable`);

                    // TODO: what if this is not a DataStream, but BufferStream stream!!!!
                    stream = DataStream.from(intermediate as Readable);
                }
            } else {
                this.logger.info("All sequences processed.");

                intermediate = await out;

                if (intermediate instanceof DataStream) {
                    stream = intermediate;
                } else if (!isPrimitive(intermediate)) {
                    stream = DataStream.from(intermediate as Readable);
                } else {
                    stream = undefined;
                }
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
        if (isPrimitive(intermediate)) {
            this.logger.info("Primitive returned as last value");

            this.outputStream?.end(`${intermediate}`);
            this.endRunner();
        } else if (stream && this.outputStream && this.outputDataStream) {
            this.logger.info(`Piping sequence output (type ${typeof stream})`);

            stream
                .once("end", () => {
                    this.logger.info("Sequence stream ended");
                    this.endRunner();
                })
                .pipe(
                    stream instanceof StringStream || stream instanceof BufferStream
                        ? this.outputStream
                        : this.outputDataStream
                );
        } else {
            // TODO: this should push a PANG message with the sequence description
            this.logger.info("Sequence did not output a stream");
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

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
    MaybePromise,
    MonitoringRateMessageData,
    StopSequenceMessageData,
    Streamable,
    SynchronousStreamable,
    HasTopicInformation,
    IObjectLogger,
    HostClient
} from "@scramjet/types";
import { RunnerError } from "@scramjet/model";
import { ObjLogger } from "@scramjet/obj-logger";
import { RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";
import { defer } from "@scramjet/utility";

import { BufferStream, DataStream, StringStream } from "scramjet";

import { EventEmitter } from "events";
import { Readable, Writable } from "stream";

import { RunnerAppContext, RunnerProxy } from "./runner-app-context";
import { mapToInputDataStream, readInputStreamHeaders, inputStreamInitLogger } from "./input-stream";
import { MessageUtils } from "./message-utils";
import { HostClient as HostApiClient } from "@scramjet/api-client";
import { ClientUtilsCustomAgent } from "@scramjet/client-utils";
import { ManagerClient } from "@scramjet/manager-api-client";

// async function flushStream(source: Readable | undefined, target: Writable) {
//     if (!source) return;

//     source
//         .unpipe(target)
//         .pause();

//     if (source.readableLength > 0) {
//         target.end(source.readableLength);
//     }
//     await new Promise(res => target.once("close", res));
// }

type MaybeArray<T> = T | T[];
type Primitives = string | number | boolean | void | null;
type OverrideConfig = {
    write: typeof Writable.prototype.write;
    drainCb: (...x: any[]) => void;
    errorCb: (...x: any[]) => void;
};

export function isSynchronousStreamable(obj: SynchronousStreamable<any> | Primitives):
    obj is SynchronousStreamable<any> {
    return !["string", "number", "boolean", "undefined", "null"].includes(typeof obj);
}

const overrideMap: Map<Writable, OverrideConfig> = new Map();

function overrideStandardStream(oldStream: Writable, newStream: Writable) {
    if (overrideMap.has(oldStream)) {
        throw new Error("Attempt to override stream more than once");
    }

    const write = oldStream.write;

    if (process.env.PRINT_TO_STDOUT) {
        // @ts-ignore
        oldStream.write = (...args) => { write.call(oldStream, ...args); return newStream.write(...args); };
    } else {
        oldStream.write = newStream.write.bind(newStream);
    }

    const drainCb = () => oldStream.emit("drain");
    const errorCb = (err: any) => oldStream.emit("error", err);

    newStream.on("drain", drainCb);
    newStream.on("error", errorCb);

    overrideMap.set(oldStream, { write, drainCb, errorCb });
}

function revertStandardStream(oldStream: Writable) {
    if (overrideMap.has(oldStream)) {
        const { write, drainCb, errorCb } = overrideMap.get(oldStream) as OverrideConfig;

        // @ts-ignore - this is ok, we're doing this on purpose!
        delete oldStream.write;

        // if prototypic write is there, then no change needed
        if (oldStream.write !== write)
            oldStream.write = write;

        oldStream.off("drain", drainCb);
        oldStream.off("error", errorCb);
        overrideMap.delete(oldStream);
    }
}

/**
 * Runtime environment for sequence code.
 * Communicates with Host with data transferred to/from Sequence, health info,
 * reacts to control messages such as stopping etc.
 */
export class Runner<X extends AppConfig> implements IComponent {
    private emitter;
    private _context?: RunnerAppContext<X, any>;
    private monitoringInterval?: NodeJS.Timeout;
    private keepAliveRequested?: boolean;

    private stopExpected: boolean = false;
    handshakeResolver?: { res: Function, rej: Function };

    logger: IObjectLogger;

    private inputDataStream: DataStream;
    private outputDataStream: DataStream;

    constructor(
        private sequencePath: string,
        private hostClient: IHostClient,
        private instanceId: string
    ) {
        this.emitter = new EventEmitter();

        this.logger = new ObjLogger(this, { id: instanceId });
        hostClient.logger.pipe(this.logger);
        inputStreamInitLogger.pipe(this.logger);

        if (process.env.PRINT_TO_STDOUT) {
            this.logger.addOutput(process.stdout);
        }

        this.inputDataStream = new DataStream().catch((e: any) => {
            this.logger.error("Error during input data stream", e);

            throw e;
        });

        this.outputDataStream = new DataStream({ highWaterMark: 0 }).catch((e: any) => {
            this.logger.error("Error during input data stream", e);

            throw e;
        });
    }

    get context(): RunnerAppContext<X, any> {
        if (!this._context) {
            this.logger.error("Uninitialized context");

            throw new RunnerError("UNINITIALIZED_CONTEXT");
        }

        return this._context;
    }

    async controlStreamHandler([code, data]: EncodedControlMessage) {
        this.logger.debug("Control message received", code, data);

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
                this.logger.error("Error parsing control message", error);
            });
    }

    async setInputContentType(headers: any) {
        const contentType = headers["content-type"];

        this.logger.debug("Content-Type", contentType);

        mapToInputDataStream(this.hostClient.inputStream, contentType)
            .catch((error: any) => {
                this.logger.error("mapToInputDataStream", error);
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
        this.logger.debug("Handling KILL request");

        this.context.killHandler();

        if (!this.stopExpected) {
            this.logger.trace(`Exiting (unexpected, ${RunnerExitCode.KILLED})`);
            return this.exit(RunnerExitCode.KILLED);
        }

        this.logger.trace("Exiting (expected)");
        return this.exit(RunnerExitCode.STOPPED);
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

            this.logger.error("Error stopping Sequence", err);
        }

        if (!data.canCallKeepalive || !this.keepAliveRequested) {
            MessageUtils.writeMessageOnStream(
                [RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError }], this.hostClient.monitorStream
            );
        }

        this.stopExpected = true;
    }

    private keepAliveIssued(): void {
        this.keepAliveRequested = true;
    }

    private async exit(exitCode?: number) {
        //TODO: we need to wait a bit for the logs to flush - we shouldn't need to as cleanup should wait.
        await defer(200);

        this.cleanup()
            .then((code) => { process.exitCode = exitCode || code; }, (e) => console.error(e?.stack))
            .finally(() => process.exit());
    }

    async main() {
        await this.hostClient.init(this.instanceId);

        this.redirectOutputs();

        this.defineControlStream();

        this.hostClient.stdinStream
            .on("data", (chunk) => process.stdin.unshift(chunk))
            .on("end", () => process.stdin.emit("end"));

        process.stdin.on("pause", () => this.hostClient.stdinStream.pause());
        process.stdin.on("resume", () => this.hostClient.stdinStream.resume());

        this.logger.debug("Streams initialized");

        this.sendHandshakeMessage();

        const { appConfig, args } = await this.waitForHandshakeResponse();

        this.logger.debug("Handshake received");

        this.initAppContext(appConfig as X);

        await this.reportHealth();
        await this.handleMonitoringRequest({ monitoringRate: 1 });

        let sequence: any[] = [];

        try {
            sequence = this.getSequence();
            // this.logger.debug("Sequence", sequence);

            if (sequence.length && typeof sequence[0] !== "function") {
                this.logger.debug("First Sequence object is not a function:", sequence[0]);

                MessageUtils.writeMessageOnStream(
                    [RunnerMessageCode.PANG, {
                        requires: sequence[0].requires,
                        contentType: sequence[0].contentType
                    }], this.hostClient.monitorStream);

                this.logger.trace("Waiting for input stream");

                await this.setInputContentType({
                    "content-type": sequence[0].contentType
                });

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
                    });
            }

            this.logger.info("Sequence loaded, functions count", sequence.length);
        } catch (error: any) {
            if (error instanceof SyntaxError) {
                this.logger.error("Sequence syntax error.", error.stack);
            } else {
                this.logger.error("Sequence error:", error.stack);
            }

            return this.exit(RunnerExitCode.SEQUENCE_FAILED_ON_START);
        }

        try {
            await this.runSequence(sequence, args);

            this.logger.trace(`Sequence completed. Waiting ${this.context.exitTimeout}ms with exit.`);
            this.writeMonitoringMessage([RunnerMessageCode.SEQUENCE_COMPLETED, { timeout: this.context.exitTimeout }]);

            await defer(this.context.exitTimeout);
            return this.exit(0);
        } catch (error: any) {
            this.logger.error("Error occurred during Sequence execution: ", error.stack);

            return this.exit(RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION);
        }
    }

    async cleanup(): Promise<number> {
        this.logger.info("Cleaning up");

        await this.revertOutputs();

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.logger.trace("Monitoring interval removed");
        }

        let exitcode = 0;

        try {
            this.logger.info("Cleaning up streams");

            await this.hostClient.disconnect();
        } catch (e: any) {
            exitcode = RunnerExitCode.CLEANUP_FAILED;
        }

        return exitcode;
    }

    private async revertOutputs() {
        this.logger.unpipe(this.hostClient.logStream);
        revertStandardStream(process.stdout);
        revertStandardStream(process.stderr);
        this.logger.addOutput(process.stderr);
    }

    private redirectOutputs() {
        this.logger.pipe(this.hostClient.logStream, { stringified: true });
        this.outputDataStream
            .JSONStringify()
            .pipe(this.hostClient.outputStream);

        overrideStandardStream(process.stdout, this.hostClient.stdoutStream);
        overrideStandardStream(process.stderr, this.hostClient.stderrStream);
    }

    /**
     * initialize app context
     * set up streams process.stdin, process.stdout, process.stderr, fifo downstream, fifo upstream
     *
     * @param config Configuration for App.
     */
    initAppContext(config: X) {
        const hostClientUtils = new ClientUtilsCustomAgent("http://scramjet-host/api/v1", this.hostClient.getAgent());
        const hostApiClient = new HostApiClient("http://scramjet-host/api/v1", hostClientUtils);

        const managerClientUtils = new ClientUtilsCustomAgent("http://scramjet-host/api/v1/cpm/api/v1", this.hostClient.getAgent());
        const managerApiClient = new ManagerClient("http://scramjet-host/api/v1/cpm/api/v1", managerClientUtils);

        const runner: RunnerProxy = {
            keepAliveIssued: () => this.keepAliveIssued(),
            sendStop: (err?: Error) => {
                this.writeMonitoringMessage([RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError: err }]);
            },
            sendKeepAlive: (ev) => this.writeMonitoringMessage([RunnerMessageCode.ALIVE, ev]),
            sendEvent: (ev) => this.writeMonitoringMessage([RunnerMessageCode.EVENT, ev])
        };

        this._context = new RunnerAppContext(
            config,
            this.hostClient.monitorStream,
            this.emitter,
            runner,
            hostApiClient as HostClient,
            managerApiClient,
            this.instanceId
        );
        this._context.logger.pipe(this.logger);

        this.handleSequenceEvents();
    }

    private writeMonitoringMessage(encodedMonitoringMessage: EncodedMonitoringMessage) {
        MessageUtils.writeMessageOnStream(encodedMonitoringMessage, this.hostClient.monitorStream);
        // TODO: what if it fails?
    }

    sendHandshakeMessage() {
        MessageUtils.writeMessageOnStream([RunnerMessageCode.PING, {}], this.hostClient.monitorStream);

        this.logger.trace("Handshake sent");
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

        const sequenceArr = Array.isArray(_sequence) ? _sequence : [_sequence];

        if (!sequenceArr.length) {
            throw new Error("Empty Sequence");
        }

        return sequenceArr;
    }

    // eslint-disable-next-line complexity
    async runSequence(sequence: any[], args: any[] = []): Promise<void> {
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
                this.logger.debug("Processing function on index", sequence.length - itemsLeftInSequence - 1);

                out = func.call(
                    this.context,
                    stream,
                    ...args
                );

                this.logger.debug("Function called", sequence.length - itemsLeftInSequence - 1);
            } catch (error: any) {
                this.logger.error("Function errored", sequence.length - itemsLeftInSequence, error.stack);

                throw new RunnerError("SEQUENCE_RUNTIME_ERROR");
            }

            if (itemsLeftInSequence > 0) {
                intermediate = await out;

                this.logger.info("Function output type", sequence.length - itemsLeftInSequence - 1, typeof out);
                if (!intermediate) {
                    this.logger.error("Sequence ended premature");

                    throw new RunnerError("SEQUENCE_ENDED_PREMATURE");
                } else if (typeof intermediate === "object" && intermediate instanceof DataStream) {
                    this.logger.debug("Sequence function returned DataStream.", sequence.length - itemsLeftInSequence - 1);

                    stream = intermediate;
                } else {
                    this.logger.debug("Sequence function returned readable", sequence.length - itemsLeftInSequence - 1);
                    // TODO: what if this is not a DataStream, but BufferStream stream!!!!
                    stream = DataStream.from(intermediate as Readable);
                }
            } else {
                this.logger.info("All Sequences processed.");

                intermediate = await out;

                if (intermediate instanceof Readable) {
                    stream = intermediate;
                } else if (intermediate !== undefined && isSynchronousStreamable(intermediate)) {
                    stream = Object.assign(DataStream.from(intermediate as Readable, { highWaterMark: 0 }), {
                        topic: intermediate.topic,
                        contentType: intermediate.contentType
                    });
                } else {
                    stream = undefined;
                }

                this.logger.debug("Stream type is", typeof stream);
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
                this.logger.trace("Piping Sequence output", typeof stream);

                const shouldSerialize = stream.contentType &&
                ["application/x-ndjson", "text/x-ndjson"].includes(stream.contentType) ||
                stream instanceof DataStream && !(
                    stream instanceof StringStream || stream instanceof BufferStream
                );

                stream
                    .once("end", () => {
                        this.logger.debug("Sequence stream ended");
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
                this.logger.debug("Sequence did not output a stream");
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

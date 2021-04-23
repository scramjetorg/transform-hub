import { EventMessageData, HandshakeAcknowledgeMessageData, MonitoringMessageData, MonitoringRateMessageData, RunnerError, RunnerMessageCode, StopSequenceMessageData } from "@scramjet/model";
import { ApplicationFunction, ApplicationInterface, ReadableStream, WritableStream, AppConfig, EncodedControlMessage, SynchronousStreamable, Logger } from "@scramjet/types";

import { from as scramjetStreamFrom, DataStream, PromiseTransform, StringStream } from "scramjet";

import { exec } from "child_process";
import { EventEmitter } from "events";
import { Readable } from "stream";
import { createReadStream, createWriteStream } from "fs";
import { RunnerAppContext } from "./runner-app-context";
import { MessageUtils } from "./message-utils";
import { addLoggerOutput, getLogger } from "@scramjet/logger";
import { IComponent } from "@scramjet/types";

type MaybeArray<T> = T | T[];
export class Runner<X extends AppConfig> implements IComponent {
    private emitter;
    private context?: RunnerAppContext<X, any>;
    private monitoringInterval?: NodeJS.Timeout;
    private monitorStream?: WritableStream<any>; //TODO change any to EncodedMonitoringMessage
    private loggerStream?: WritableStream<string>;
    private controlStream?: any; //TODO change type ReadableStream<EncodedControlMessage>;
    private monitorFifoPath: string;
    private controlFifoPath: string;
    private loggerFifoPath: string;
    /**
     * @analyze-how-to-pass-in-out-streams
     * Similarly to monitor and control streams,
     * two additional fifo path properties need to be created:
     * inputFifoPath- input stream to the Sequence
     * outputFifoPath - output stream for a Sequence
     * and corresponding two properties for input and output stream references:
     * inputStream?: ReadableStream
     * outputStream?: WritableStream
     */
    private sequencePath: string;
    private keepAliveRequested?: boolean;

    logger: Logger;

    constructor(sequencePath: string, fifosPath: string) {
        this.emitter = new EventEmitter();
        /**
         * @analyze-how-to-pass-in-out-streams
         * Additional two fifo paths need to be assigned here
         * input.fifo - input stream to the Sequence
         * output.fifo - output stream for a Sequence
         */
        this.controlFifoPath = `${fifosPath}/control.fifo`;
        this.monitorFifoPath = `${fifosPath}/monitor.fifo`;
        this.loggerFifoPath = `${fifosPath}/logger.fifo`;
        this.logger = getLogger(this);

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
            /**
            * @analyze-how-to-pass-in-out-streams
            * We need to make sure we close
            * input and output streams.
            */
            break;
        case RunnerMessageCode.STOP:
            await this.addStopHandlerRequest(data as StopSequenceMessageData);
            /**
             * @analyze-how-to-pass-in-out-streams
             * We need to make sure we close
             * input and output streams.
             */
            break;
        case RunnerMessageCode.FORCE_CONFIRM_ALIVE:
            await this.handleForceConfirmAliveRequest();
            break;
        case RunnerMessageCode.PONG:
            await this.handleReceptionOfHandshake(data as HandshakeAcknowledgeMessageData);
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
        await this.defineControlStream();
    }

    async defineControlStream() {
        StringStream
            .from(this.controlStream)
            .JSONParse()
            .map(async ([code, data]: EncodedControlMessage) => this.controlStreamHandler([code, data]))
            .run()
            .catch(async (error) => {
                this.logger.error("An error occurred during parsing control message.", error.stack);
            });
    }

    async cleanup() {
        this.logger.info("Cleaning up...");
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        try {
            await this.cleanupControlStream();
            this.logger.info("Clean!");
        } catch (e) {
            this.logger.error("Not clear, error", e);
        }
    }

    async cleanupControlStream() {
        this.controlStream.destroy();
        // TODO: needs error handling and a callback?
        exec(`echo "\r\n" > ${this.controlFifoPath}`);
    }

    async hookupMonitorStream() {
        this.monitorStream = createWriteStream(this.monitorFifoPath);
    }

    async hookupLoggerStream() {
        this.loggerStream = createWriteStream(this.loggerFifoPath);
    }

    async hookupFifoStreams() {
        return Promise.all([
            this.hookupLoggerStream(),
            this.hookupControlStream(),
            this.hookupMonitorStream()
        ]);
    }

    async initializeLogger() {
        if (this.loggerStream) {
            addLoggerOutput(this.loggerStream, this.loggerStream);
        } else {
            throw new RunnerError("UNINITIALIZED_STREAMS");
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
            const message: MonitoringMessageData = await this.context?.monitor() || { healthy: true };

            MessageUtils.writeMessageOnStream([RunnerMessageCode.MONITORING, message], this.monitorStream);
            working = false;

        }, 1000 / data.monitoringRate).unref();
    }

    async handleKillRequest(): Promise<void> {
        this.context?.killHandler();
        //letting time for "on kill" actions
        //TODO cosult with Michał Cz.
        await new Promise(res => setTimeout(res, 1000));
        console.log("-----kill 2000 ms after");
        await this.cleanupControlStream();

        process.exit(137);
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
                [RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError }], this.monitorStream
            );
            //TODO add save, cleaning etc when implemented
        }
    }

    keepAliveIssued(): void {
        this.keepAliveRequested = true;
    }

    async handleReceptionOfHandshake(data: HandshakeAcknowledgeMessageData): Promise<void> {
        /**
         * @analyze-how-to-pass-in-out-streams
         * Before we start a Sequence we should create readable and writable streams
         * to input and output.
         * In a fashion similar to how we create monitor and control streams,
         * but after the acknowledge message comes (PONG) and
         * before we start a Sequence.
         */
        this.logger.log("Handshake received.");

        this.initAppContext(data.appConfig as X);

        try {
            await this.runSequence(data.arguments);
        } catch (error) {
            console.error("Error occured during sequence execution: ", error);
            await this.cleanupControlStream();
            process.exit(22);
        }
    }

    // TODO: this should be the foll class logic
    /**
     * Initialization of runner class.
     * * initilize streams (fifo and std)
     * * send handshake (via monitor stream) to LCDA and receive an answer from LCDA (via control stream)
     */
    async main() {
        await this.hookupFifoStreams();
        await this.initializeLogger();
        this.sendHandshakeMessage();
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

        const runner = {
            keepAliveIssued: () => this.keepAliveIssued()
        };

        this.context = new RunnerAppContext(config, this.monitorStream, this.emitter, runner);

        this.handleSequenceEvents();
    }

    sendHandshakeMessage() {
        this.logger.info("Sending handshake.");
        MessageUtils.writeMessageOnStream([RunnerMessageCode.PING, {}], this.monitorStream);
    }

    getSequence(): ApplicationInterface[] {
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
    async runSequence(args: any[] = []): Promise<void> {
        if (!this.context) {
            this.logger.error("Uninitialized context.");
            throw new RunnerError("UNINITIALIZED_CONTEXT");
        }

        await this.handleMonitoringRequest({ monitoringRate:1 });

        let sequence;

        try {
            sequence = this.getSequence();
            this.logger.log(`Seqeunce loaded, functions count: ${sequence.length}.`);
        } catch (error) {
            if (error instanceof SyntaxError) {
                this.logger.error("Sequence syntax error.", error.message);
            } else {
                this.logger.error("Sequence error:", error.message);
            }

            await this.cleanupControlStream();
            process.exit(21);
        }

        this.logger.log(`Seqeunce loaded, length: ${sequence.length}.`);

        /**
         * @analyze-how-to-pass-in-out-streams
         * Output stream will be returned from the Sequence:
         * await const outputStream = sequence.call(..);
         * This outputStreams needs to be piped to the
         * local Runner property outputStream (named fifo pipe).
         *
         * Pass the input stream to stream instead of creating new DataStream();
         */
        let stream = new DataStream() as unknown as ReadableStream<any>;
        let itemsLeftInSequence = sequence.length;

        for (const func of sequence) {
            itemsLeftInSequence--;

            let out: SynchronousStreamable<any> | void;

            try {
                this.logger.info(`Processing function on index: ${sequence.length - itemsLeftInSequence - 1}`);
                out = await func.call(
                    this.context,
                    /**
                     * @analyze-how-to-pass-in-out-streams
                     * Input stream to the Sequence will be passed as an argument
                     * instead of
                     * new DataStream() as unknown as ReadableStream<never>
                     */
                    stream,
                    ...args
                );
                this.logger.info(`Function on index: ${sequence.length - itemsLeftInSequence - 1} called.`);
            } catch (error) {
                this.logger.error(`Sequence error (function index ${sequence.length - itemsLeftInSequence})`, error);
                throw new RunnerError("SEQUENCE_RUNTIME_ERROR");
            }

            if (!out) {
                if (itemsLeftInSequence > 0) {
                    this.logger.error("Sequence ended premature");
                    throw new RunnerError("SEQUENCE_ENDED_PREMATURE");
                }
            } else if (typeof out === "object" && out instanceof PromiseTransform) {
                stream = scramjetStreamFrom(out) as unknown as ReadableStream<any>;
            } else {
                // TODO: what if this is not a DataStream, but BufferStream stream
                stream = DataStream.from(out as Readable) as unknown as ReadableStream<any>;
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
        await this.cleanup();
    }

    handleSequenceEvents() {
        this.emitter.on("error", (e) => {
            this.logger.error(e);
        });
    }
    // private isPipeableStream<T extends any = any>(out: SynchronousStreamable<T>): out is PipeableStream<T> {
    //     if (typeof out === "function")
    //         return false;
    //     const ref = out as PipeableStream<T>;

    //     return typeof ref.pipe === "function" && typeof ref.read === "function";
    // }
}

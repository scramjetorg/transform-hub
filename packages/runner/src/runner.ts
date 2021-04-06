import { EventMessageData, HandshakeAcknowledgeMessageData, MonitoringMessageData, MonitoringRateMessageData, RunnerMessageCode, StopSequenceMessageData } from "@scramjet/model";
import { ReadableStream, WritableStream, AppConfig, Application, EncodedControlMessage } from "@scramjet/types";
import { exec } from "child_process";
import { EventEmitter } from "events";
import { createReadStream, createWriteStream } from "fs";
import { DataStream, StringStream } from "scramjet";
import { RunnerAppContext } from "./runner-app-context";
import { MessageUtils } from "./message-utils";
export class Runner {
    private emitter;
    private context?: RunnerAppContext<any, any>;
    private monitoringInterval?: NodeJS.Timeout;
    private monitorStream?: WritableStream<any>; //TODO change any to EncodedMonitoringMessage
    private controlStream?: any; //TODO change type ReadableStream<EncodedControlMessage>;
    private monitorFifoPath: string;
    private controlFifoPath: string;
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
        this.sequencePath = sequencePath;
    }

    async controlStreamHandler([code, data]: EncodedControlMessage) {
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
            await this.handleStopRequest(data as StopSequenceMessageData);
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
        StringStream
            .from(this.controlStream)
            .JSONParse()
            .map(async ([code, data]: EncodedControlMessage) => this.controlStreamHandler([code, data]))
            .run()
            .catch(async (error) => {
                console.error("An error occurred during parsing control message.", error.stack);
            });
    }

    async cleanupControlStream() {
        this.controlStream.destroy();
        // TODO: needs error handling and a callback?
        exec(`echo "\r\n" > ${this.controlFifoPath}`);
    }

    async hookupMonitorStream() {
        this.monitorStream = createWriteStream(this.monitorFifoPath);
    }

    async hookupFifoStreams() {
        return Promise.all([
            this.hookupControlStream(),
            this.hookupMonitorStream()
        ]);
    }

    handleForceConfirmAliveRequest() {
        throw new Error("Method not implemented.");
    }

    async handleMonitoringRequest(data: MonitoringRateMessageData): Promise<void> {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        this.monitoringInterval = setInterval(() => {
            const message: MonitoringMessageData = { healthy: true };

            if (this.context === undefined || this.context.monitor === undefined) {
                throw new Error("Unrecognized message code: ");
            }

            this.context.monitor(message);
        }, data.monitoringRate);
    }

    async handleKillRequest(): Promise<void> {
        this.context?.killHandler();
        this.cleanupControlStream();

        process.exit(137);
    }

    async handleStopRequest(data: StopSequenceMessageData): Promise<void> {
        if (!this.context) {
            throw new Error("Context undefined.");
        }

        let sequenceError: Error | undefined;

        try {
            await this.context?.stopHandler(
                data.timeout,
                data.canCallKeepalive
            );
        } catch (err) {
            sequenceError = err;
        }

        const errorData = sequenceError ? { sequenceError } : {};

        MessageUtils.writeMessageOnStream([RunnerMessageCode.SEQUENCE_STOPPED, errorData], this.monitorStream);
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
        await this.initAppContext(data.appConfig);
        // TODO: this needs to somehow error handled
        this.runSequence(data.arguments);
    }

    // TODO: this should be the foll class logic
    /**
     * Initialization of runner class.
     * * initilize streams (fifo and std)
     * * send handshake (via monitor stream) to LCDA and receive an answer from LCDA (via control stream)
     */
    async main() {
        await this.hookupFifoStreams();
        this.sendHandshakeMessage();

    }

    /**
     * initialize app context
     * set up streams process.stdin, process.stdout, process.stderr, fifo downstream, fifo upstream
     *
     * @param config Configuration for App.
     */
    initAppContext(config: AppConfig) {
        if (this.monitorStream === undefined) {
            throw new Error("Monitor Stream is not defined.");
        }

        this.context = new RunnerAppContext(config, this.monitorStream, this.emitter);
    }

    sendHandshakeMessage() {
        MessageUtils.writeMessageOnStream([RunnerMessageCode.PING, {}], this.monitorStream);
    }

    getSequence(): Application {
        return require(this.sequencePath).default;
    }

    /**
     * run sequence
     *
     * @param args {any[]} arguments that the app will be called with
     */
    async runSequence(args?: any[]) {
        const sequence: any = this.getSequence();

        if (Array.isArray(args) && args.length) {
            /**
            * @analyze-how-to-pass-in-out-streams
            * Output stream will be returned from the Sequence:
            * await const outputStream = sequence.call(..);
            * This outputStreams needs to be piped to the
            * local Runner property outputStream (named fifo pipe).
            */
            await sequence.call(
                this.context,
                /**
                 * @analyze-how-to-pass-in-out-streams
                 * Input stream to the Sequence will be passed as an argument
                 * instead of
                 * new DataStream() as unknown as ReadableStream<never>
                 */
                new DataStream() as unknown as ReadableStream<never>,
                ...args
            );
        } else {
            await sequence.call(
                this.context,
                /**
                 * @analyze-how-to-pass-in-out-streams
                 * Input stream will be passes as argument here
                 * instead of
                 * new DataStream() as unknown as ReadableStream<never>
                 */
                new DataStream() as unknown as ReadableStream<never>
            );
        }
        /**
         * @analyze-how-to-pass-in-out-streams
         * We need to make sure to close input and output streams
         * after Sequence terminates.
         */
        await this.cleanupControlStream();
    }
}

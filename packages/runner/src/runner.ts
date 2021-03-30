import { EventMessageData, HandshakeAcknowledgeMessageData, MonitoringMessageData, MonitoringRateMessageData, RunnerMessageCode, StopSequenceMessageData } from "@scramjet/model";
import { ReadableStream, WritableStream, AppConfig, Application, AutoAppContext, EncodedControlMessage } from "@scramjet/types";
import { exec } from "child_process";
import { EventEmitter } from "events";
import { createReadStream, createWriteStream } from "fs";
import { DataStream, StringStream } from "scramjet";
import { RunnerAppContext } from "./runner-app-context";
import { MessageUtils } from "./message-utils";
export class Runner {
    private emitter;
    private context?: AutoAppContext<any, any>;
    private monitoringInterval?: NodeJS.Timeout;
    private monitorStream?: WritableStream<any>; //TODO change any to EncodedMonitoringMessage
    private controlStream?: any; //TODO change type ReadableStream<EncodedControlMessage>;
    private monitorFifoPath: string;
    private controlFifoPath: string;
    private sequencePath: string;

    constructor(sequencePath: string, fifosPath: string) {
        this.emitter = new EventEmitter();
        this.controlFifoPath = `${fifosPath}/control.fifo`;
        this.monitorFifoPath = `${fifosPath}/monitor.fifo`;
        this.sequencePath = sequencePath;
    }

    async controlStreamHandler([code, data]: EncodedControlMessage){
        switch (code) {
        case RunnerMessageCode.MONITORING_RATE:
            await this.handleMonitoringRequest(data as MonitoringRateMessageData);
            break;
        case RunnerMessageCode.KILL:
            await this.handleKillRequest();
            break;
        case RunnerMessageCode.STOP:
            await this.handleStopRequest(data as StopSequenceMessageData);
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
        this.context?.killHandler?.call(this.context);
        this.cleanupControlStream();

        process.exit(137);
    }

    async handleStopRequest(data: StopSequenceMessageData): Promise<void> {
        await this.context?.stopHandler?.call(this.context,
            data.timeout,
            data.canCallKeepalive
        );

        await this.handleStopSequence();
    }

    async handleStopSequence(err?: Error): Promise<void> {
        MessageUtils.writeMessageOnStream([RunnerMessageCode.SEQUENCE_STOPPED, { err }], this.monitorStream);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handleSave(state: any): void {
        throw new Error("Method not implemented.");
    }

    async handleReceptionOfHandshake(data: HandshakeAcknowledgeMessageData): Promise<void> {
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
            await sequence.call(
                this.context,
                new DataStream() as unknown as ReadableStream<never>,
                ...args
            );
        } else {
            await sequence.call(
                this.context,
                new DataStream() as unknown as ReadableStream<never>
            );
        }

        await this.cleanupControlStream();
    }
}

import { AppError, EventMessageData, HandshakeAcknowledgeMessageData, MonitoringMessageData, MonitoringRateMessageData, RunnerMessageCode, StopSequenceMessageData } from "@scramjet/model";
import { AppConfig, Application, AutoAppContext } from "@scramjet/types";
import { EncodedControlMessage } from "@scramjet/types/src/message-streams";
import { ReadableStream, WritableStream } from "@scramjet/types/src/utils";
import { EventEmitter } from "events";
import { createReadStream, createWriteStream } from "fs";
import { DataStream, StringStream } from "scramjet";

export class Runner {
    private emitter;
    // @ts-ignore
    private statusIntervalHandle: any;
    private context?: AutoAppContext<any, any>;
    private interval?: NodeJS.Timeout;
    private monitorStream?: WritableStream<any>;//TODO change any to EncodedMonitoringMessage
    private controlStream?: any;//TODO change type ReadableStream<EncodedControlMessage>;
    private monitorFifoPath: string;
    private controlFifoPath: string;
    private sequencePath: string;

    constructor(sequencePath: string, fifosPath: string) {
        this.emitter = new EventEmitter();
        this.controlFifoPath = `${fifosPath}/control.fifo`;
        this.monitorFifoPath = `${fifosPath}/monitor.fifo`;
        this.sequencePath = sequencePath;
    }

    async hookupControlStream() {
        this.controlStream = createReadStream(this.controlFifoPath);

        StringStream
            .from(this.controlStream)
            .JSONParse()
            .map(async ([code, data]: EncodedControlMessage) => {
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
                    let eventData = data as EventMessageData;

                    this.emitter.emit(eventData.eventName, eventData.message);
                    break;
                default:
                    break;
                }
            })
            .run()
            .catch(async () => { console.error("An error occurred during parsing control message."); });
    }

    async hookupMonitorStream() {
        this.monitorStream = createWriteStream(this.monitorFifoPath);
    }

    async hookupFifoStreams() {
        this.hookupControlStream();
        this.hookupMonitorStream();
    }

    handleForceConfirmAliveRequest() {
        throw new Error("Method not implemented.");
    }

    async handleMonitoringRequest(data: MonitoringRateMessageData): Promise<void> {
        if (this.interval) {
            clearInterval(this.interval);
        }

        this.interval = setInterval(() => {
            const message: MonitoringMessageData = { healthy: true };

            if (this.context === undefined || this.context.monitor === undefined) {
                throw new Error("Unrecognized message code: ");
            }

            this.context.monitor(message);
        }, data.monitoringRate);
    }

    async handleKillRequest(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleStopRequest(data: StopSequenceMessageData): Promise<void> {
        await this.handleStopSequence();
        throw new Error("Method not implemented.");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleStopSequence(err?: Error): Promise<void> {
        throw new Error("Method not implemented.");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handleSave(state: any): void {
        throw new Error("Method not implemented.");
    }

    async handleReceptionOfHandshake(data: HandshakeAcknowledgeMessageData): Promise<void> {
        this.initAppContext(data.appConfig);
        this.runSequence(data.arguments);
    }

    /**
     * Initialization of runner class.
     * * initilize streams (fifo and std)
     * * send handshake (via monitor stream) to LCDA and receive an answer from LCDA (via control stream)
     */
    init() {
        this.hookupFifoStreams();
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

        const monitor = this.monitorStream;
        // eslint-disable-next-line consistent-this
        const that = this;

        this.context = {
            config: config,
            AppError: AppError,

            keepAlive(millis: number = 1000) {
                monitor.write([
                    RunnerMessageCode.ALIVE, { keepAlive: millis || 0 }
                ]);
                return this;
            },
            emit(eventName: string, message: any) {
                monitor.write([RunnerMessageCode.EVENT, { eventName, message }]);
                return this;
            },
            on(eventName: string, handler: (message?: any) => void) {
                that.emitter.on(eventName, handler);
                return this;
            },
            save(state) {
                that.handleSave(state);
                return this;
            },
            destroy(error?: AppError) {
                that.handleStopSequence(error);
                return this;
            },
            end() {
                //should this method notify instance that the pocess is stopped?
                that.handleStopSequence();
                return this;
            }
        };
    }

    sendHandshakeMessage() {
        if (this.monitorStream === undefined) {
            throw new Error("Monitor Stream is not defined.");
        }

        this.monitorStream.write(JSON.stringify([RunnerMessageCode.PING, {}]) + "\r\n");
    }

    getSequence(): Application {
        return require(this.sequencePath);
    }

    /**
     * run sequence
     *
     * @param args arguments that the app will be called with
     */
    runSequence(args: any[]) {
        const sequence: any = this.getSequence();

        sequence.call(
            this.context,
            new DataStream() as unknown as ReadableStream<never>,
            ...args
        );
    }
}

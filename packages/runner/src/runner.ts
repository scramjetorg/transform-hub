import { DataStream, StringStream } from "scramjet";
import { Application, AutoAppContext } from "@scramjet/types";
import { AppError, EventMessageData, MonitoringMessageData, MonitoringRateMessageData, RunnerMessageCode, StopSequenceMessageData } from "@scramjet/model";
import { createReadStream, createWriteStream } from "fs";
import { EncodedControlMessage } from "@scramjet/types/src/message-streams";
import { EventEmitter } from "events";
import { ReadableStream } from "@scramjet/types/src/utils";

export class Runner {
    private emitter;
    // @ts-ignore
    private statusIntervalHandle: any;
    private context?: AutoAppContext<any, any>;
    private interval?: NodeJS.Timeout;
    // @ts-ignore
    private monitorStream?: WritableStream<EncodedMonitoringMessage>;
    private controlStream?: any;//TODO change type ReadableStream<EncodedControlMessage>;
    private monitorFifoPath: string;
    private controlFifoPath: string;
    private sequencePath: string;

    // docker -v /app/data/:/tmp/proces-39374/data/
    constructor(sequencePath: string, fifosPath: string) {
        this.emitter = new EventEmitter();
        this.controlFifoPath = `${fifosPath}/control.fifo`;
        this.monitorFifoPath = `${fifosPath}/monitor.fifo`;
        this.sequencePath = sequencePath;
    }

    async hookupStdStreams() {
        throw new Error("Method not implemented.");
    }

    async hookupFifo() {
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const eventMap = {
            [RunnerMessageCode.FORCE_CONFIRM_ALIVE]: "confirm_alive",
            [RunnerMessageCode.KILL]: "kill",
            [RunnerMessageCode.MONITORING_RATE]: "monitoring_rate",
            [RunnerMessageCode.STOP]: "stop",
            [RunnerMessageCode.EVENT]: "event"
        };

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
                    case RunnerMessageCode.EVENT:
                        let eventData = data as EventMessageData;

                        this.emitter.emit(eventData.eventName, eventData.message);
                        break;
                    default:
                        break;
                }
            });

        const monitoring = new DataStream();

        this.monitorStream = monitoring;

        monitoring
            .pipe(createWriteStream(this.monitorFifoPath));
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

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleStopRequest(data: StopSequenceMessageData): Promise<void> {
        await this.handleStopSequence();
        throw new Error("Method not implemented.");
    }

    async handleStopSequence(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    handleSave(): void {
        throw new Error("Method not implemented.");
    }

    async receivedHandshake(): Promise<void> {
        return new Promise((res, rej) => {
            const to = setTimeout(rej, 5000).unref(); // this timeout should be in some config

            this.emitter.once("confirm_alive", () => {
                clearTimeout(to);
                res();
            });
        });
    }

    /**
     * Initialization of runner class.     
     * * initilize streams (fifo and std)
     * * initialize app context 
     * * send handshake (via monitor stream) to LCDA and receive an answer from LCDA (via control stream)  
     */
    init() {
        this.hookupFifo();
        this.hookupStdStreams();
        this.initAppContext("TODO config");
        this.sendHandshakeMessage();
    }

    /**
     * initialize app context
     * set up streams process.stdin, process.stdout, process.stderr, fifo downstream, fifo upstream
     * require sequence
     */
    initAppContext(config: string) {
        const monitor = this.monitorStream;
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
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            save(state) {
                that.handleSave();
                return;
            },
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            destroy(error?: AppError) {
                that.handleStopSequence();
                return this;
            },
            end() {
                monitor.write([RunnerMessageCode.STOP]);
                that.handleStopSequence();
                return this;
            }
        };
    }

    sendHandshakeMessage() {
        throw new Error("Method not implemented.");
    }

    getSequence(): Application {
        return require(this.sequencePath);
    }

    /**
     * run sequence
     */
    executeSequence() {
        const sequence: any = this.getSequence();
        const args: any[] = [];// from PONG

        sequence.call(
            this.context,
            new DataStream() as unknown as ReadableStream<never>,
            ...args
        );
    }
}

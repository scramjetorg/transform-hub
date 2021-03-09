import { DataStream, StringStream } from "scramjet";
import { Application, AutoAppContext } from "@scramjet/types";
import { AppError, EventMessageData, MonitoringMessageData, MonitoringRateMessageData, RunnerMessageCode, StopSequenceMessageData } from "@scramjet/model";
import { createReadStream, createWriteStream } from "fs";
import { EncodedControlMessage } from "@scramjet/types/src/message-streams";
import { EventEmitter } from "events";
import { ReadableStream } from "@scramjet/types/src/utils";

export class Runner {
    private emitter = new EventEmitter();
    // @ts-ignore
    private statusIntervalHandle: any;
    private context!: AutoAppContext<any, any>s;
    private interval!: NodeJS.Timeout;
    // @ts-ignore
    private monitorStream!: WritableStream<EncodedMonitoringMessage>;
    // docker -v /app/data/:/tmp/proces-39374/data/

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

        StringStream
            .from(createReadStream("/run/scramjet-pipes/control.fifo"))
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
            .JSONStringify()
            .pipe(createWriteStream("/run/scramjet-pipes/monitoring.fifo"));
    }

    handleForceConfirmAliveRequest() {
        throw new Error("Method not implemented.");
    }

    async handleMonitoringRequest(data: MonitoringRateMessageData): Promise<void> {
        if (this.interval) clearInterval(this.interval);

        this.interval = setInterval(() => {
            const message: MonitoringMessageData = { healthy: true };

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
     * init(sequence)     
     * * initilize streams
     * * send handshake (monitor stream) to LCDA and receive an answer from LCDA (control stream)  
     * * initialize app context 
     * @param sequence 
     */
    init() {
        throw new Error("Method not implemented.");
    }

    /**
     * initialize app context
     * set up streams process.stdin, process.stdout, process.stderr, fifo downstream, fifo upstream
     * require sequence
     */
    initAppContext() {
        throw new Error("Method not implemented.");
    }

    sendHandshakeMessage() {
    }

    getSequence(): Application {
        //TODO verify volumen and sequence path
        let sequence = require("/volume/sequence_file_on_volument.js");

        return sequence;
    }

    /**
     * run sequence
     */
    executeSequence() {
        const sequence: any = this.getSequence();
        const args: any[] = [];// from
        const monitor = this.monitorStream;
        // const appError: AppErrorConstructor;
        const that = this;
        const context: AutoAppContext<any, any> = {
            config: "TODO config",
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

        sequence.call(
            context,
            new DataStream() as unknown as ReadableStream<never>,
            ...args
        );
    }
}

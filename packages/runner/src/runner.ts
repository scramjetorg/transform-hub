import { AppError, EventMessageData, HandshakeAcknowledgeMessageData, MonitoringMessageData, MonitoringRateMessageData, RunnerMessageCode, StopSequenceMessageData } from "@scramjet/model";
import { ReadableStream, WritableStream, AppConfig, Application, AutoAppContext, EncodedControlMessage } from "@scramjet/types";
import { exec } from "child_process";
import { EventEmitter } from "events";
import { createReadStream, createWriteStream } from "fs";
import { DataStream, StringStream } from "scramjet";

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
                /*  @feature/analysis-stop-kill-invocation
                *   Kill message has no properties.
                *   We should call AutoAppContext's killHandler().
                *   The killHandler() call returns void. The call is synchronous.
                *   We do not wait, the Sequence is terminated without a delay.
                */
                    await this.handleKillRequest();
                    break;
                case RunnerMessageCode.STOP:
                /*  @feature/analysis-stop-kill-invocation
                *   Stop message has two properties:
                *   timeout: number - the Sequence will be stopped after the provided timeout (miliseconds),
                *   canCallKeepalive: boolean - indicates whether Sequence can be prolong operation to complete the task
                *   We should call AutoAppContext's providing their values:
                *   stopHandler?: (timeout: number, canCallKeepalive: boolean) => MaybePromise<void>;
                *   If canCallKeepalive is true the Sequence can call keepAlive to indicate
                *   the time required to complete the execution.
                *   Once stopHandler promise is resolve we assume it is safe to terminate the Sequence.
                */
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
        this.cleanupControlStream();

        setTimeout(() => {
            process.exit(10);
        }, 5000).unref();

        /* We must call 
        */
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleStopRequest(data: StopSequenceMessageData): Promise<void> {
        // TODO: use timeout and canKeepAlive from data
        await this.handleStopSequence();
        // why still throw?
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
        // TODO:
        // await this.waitForHandshakeResponse();
        // await this.initAppContext()
        // await this.runSequence();
        // await this.cleanupControlStream();
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

        // TODO: perhaps this should be a class in a separate file, this one will get big otherwise
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
        return require(this.sequencePath).default;
    }

    /**
     * run sequence
     *
     * @param args {any[]} arguments that the app will be called with
     */
    async runSequence(args: any[]) {
        const sequence: any = this.getSequence();

        await sequence.call(
            this.context,
            new DataStream() as unknown as ReadableStream<never>,
            ...args
        );

        await this.cleanupControlStream();
    }
}

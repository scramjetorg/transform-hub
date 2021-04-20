import { MonitoringMessageFromRunnerData, RunnerMessageCode } from "@scramjet/model";
import { AppConfig, AppError, AppErrorConstructor, AppContext, EncodedMonitoringMessage, WritableStream, FunctionDefinition, KillHandler, StopHandler, MonitoringHandler } from "@scramjet/types";
import { EventEmitter } from "events";
import { MessageUtils } from "./message-utils";

function assertFunction(handler: any | Function): handler is Function {
    if (typeof handler !== "function") {
        throw new Error("Handler must be a function");
    }

    return handler;
}

export class RunnerAppContext<AppConfigType extends AppConfig, State extends any>
implements AppContext<AppConfigType, State> {
    config: AppConfigType;
    AppError!: AppErrorConstructor;
    monitorStream: WritableStream<any>;;
    emitter: EventEmitter;
    private runner;

    constructor(config: AppConfigType, monitorStream: WritableStream<any>,
        emitter: EventEmitter, runner: { keepAliveIssued(): void; }) {

        this.config = config;
        this.monitorStream = monitorStream;
        this.emitter = emitter;
        this.runner = runner;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private handleSave(state: any): void {
        throw new Error("Method not implemented.");
    }

    private notifyInstanceAboutStopping(err?: Error) {
        this.writeMonitoringMessage([RunnerMessageCode.SEQUENCE_STOPPED, { err }]);
    }

    private writeMonitoringMessage(encodedMonitoringMessage: EncodedMonitoringMessage){
        MessageUtils.writeMessageOnStream(encodedMonitoringMessage, this.monitorStream);
        // TODO: what if it fails?
    }

    private _killHandlers: KillHandler[] = [];

    killHandler() {
        for (const handler of this._killHandlers) handler();
    }

    handleKill(handler: KillHandler): this {
        assertFunction(handler);

        // TODO: should this handler be executed more than once if passed more than once?
        this._killHandlers.push(handler);
        return this;
    }

    private _stopHandlers: StopHandler[] = [];

    async stopHandler(timeout: number, canCallKeepalive: boolean) {
        for (const handler of this._stopHandlers) {
            // TODO: what should happen if an error occurs here?
            await handler(timeout, canCallKeepalive);
        }
    }

    handleStop(handler: StopHandler): this {
        assertFunction(handler);

        this._stopHandlers.push(handler);
        return this;
    }

    private _monitoringHandlers: MonitoringHandler[] = [];

    async monitor(initialMessage: MonitoringMessageFromRunnerData = { healthy: true }) {
        let message = initialMessage;

        for (const handler of this._monitoringHandlers) {
            // TODO: what should happen if an error occurs here?
            const { healthy, sequences } = await handler(message);

            message = { healthy: message.healthy && healthy, sequences };
        }
    }

    handleMonitoring(handler: MonitoringHandler): this {
        assertFunction(handler);

        this._monitoringHandlers.push(handler);
        return this;
    }

    private _definition: FunctionDefinition = {
        mode: "buffer",
        name: "anonymous function"
    };

    get definition(): FunctionDefinition {
        return this._definition;
    }

    describe(definition: FunctionDefinition): this {
        Object.assign(this.definition, definition);
        return this;
    }

    keepAlive(milliseconds?: number): this {
        this.runner.keepAliveIssued();
        this.writeMonitoringMessage([
            RunnerMessageCode.ALIVE, { keepAlive: milliseconds || 0 }
        ]);
        return this;
    }

    end(): this {
        this.notifyInstanceAboutStopping();
        return this;
    }

    destroy(error?: AppError): this {
        this.notifyInstanceAboutStopping(error);
        return this;
    }

    save(state: State): this {
        this.handleSave(state);
        return this;
    }

    on(eventName: string, handler: (message?: any) => void) {
        this.emitter.on(eventName, handler);
        return this;
    }

    emit(eventName: string, message: any) {
        this.writeMonitoringMessage([RunnerMessageCode.EVENT, { eventName, message }]);
        return this;
    }
}

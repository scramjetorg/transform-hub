import { getLogger } from "@scramjet/logger";
import {
    EventMessageData, KeepAliveMessageData, MonitoringMessageFromRunnerData,
    AppConfig, AppError, AppErrorConstructor, AppContext, WritableStream,
    FunctionDefinition, KillHandler, StopHandler, MonitoringHandler, Logger
} from "@scramjet/types";
import { EventEmitter } from "events";

function assertFunction(handler: any | Function): handler is Function {
    if (typeof handler !== "function") {
        throw new Error("Handler must be a function");
    }

    return handler;
}

export interface RunnerProxy {
    sendKeepAlive(data: KeepAliveMessageData): void;
    sendStop(error?: AppError | Error): void;
    sendEvent(ev: EventMessageData): void;
    keepAliveIssued(): void;
}

export class RunnerAppContext<AppConfigType extends AppConfig, State extends any>
implements AppContext<AppConfigType, State> {
    config: AppConfigType;
    AppError!: AppErrorConstructor;
    monitorStream: WritableStream<any>;
    emitter: EventEmitter;
    private runner;
    logger: Logger;
    initialState?: State | undefined;

    constructor(config: AppConfigType, monitorStream: WritableStream<any>,
        emitter: EventEmitter, runner: RunnerProxy) {
        this.config = config;
        this.monitorStream = monitorStream;
        this.emitter = emitter;
        this.runner = runner;
        this.logger = getLogger("Sequence");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private handleSave(state: any): void {
        throw new Error("Method not implemented.");
    }

    private _killHandlers: KillHandler[] = [];

    killHandler() {
        for (const handler of this._killHandlers) handler();
    }

    addKillHandler(handler: KillHandler): this {
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

    addStopHandler(handler: StopHandler): this {
        assertFunction(handler);

        this._stopHandlers.push(handler);
        return this;
    }

    private _monitoringHandlers: MonitoringHandler[] = [];

    async monitor(initialMessage: MonitoringMessageFromRunnerData = { healthy: true }): Promise<{healthy: boolean}> {
        let message = initialMessage;

        for (const handler of this._monitoringHandlers) {
            //TODO add sequences const { healthy, sequences } = await handler(message);
            const { healthy } = await handler(message);

            //if any of handlers returns false then healthy is false
            message = { healthy: message.healthy && healthy };
        }

        return message;
    }

    addMonitoringHandler(handler: MonitoringHandler): this {
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
        this.runner.sendKeepAlive({ keepAlive: milliseconds || 0 });
        return this;
    }

    end(): this {
        this.runner.sendStop();
        return this;
    }

    destroy(error?: AppError): this {
        this.runner.sendStop(error);
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
        this.runner.sendEvent({ eventName, message });
        // this.emitter.emit(eventName, message);
        return this;
    }
}

import { ObjLogger } from "@scramjet/obj-logger";
import {
    AppConfig,
    AppContext,
    AppError,
    AppErrorConstructor,
    APIExpose,
    EventMessageData,
    FunctionDefinition,
    HostClient,
    IObjectLogger,
    ILocalStorage,
    KeepAliveMessageData,
    KillHandler,
    LogLevel,
    ManagerClient,
    MonitoringHandler,
    MonitoringMessageFromRunnerData,
    StopHandler,
    WritableStream,
} from "@scramjet/types";
import { EventEmitter } from "events";

/**
 * Runtime guard that asserts a value is a function.
 * Throws if it is not – used by handler registration methods.
 */
function assertFunction<T extends Function>(handler: unknown): asserts handler is T {
    if (typeof handler !== "function") {
        throw new Error("Handler must be a function");
    }
}

/**
 * Sequence-local proxy used by {@link RunnerAppContext} to send framed
 * messages back to the outer runner. The runner-node package owns this
 * surface independently of the legacy runner package.
 */
export interface RunnerProxy {
    sendKeepAlive(data: KeepAliveMessageData): void;
    sendStop(error?: AppError | Error): void;
    sendEvent(ev: EventMessageData): void;
    keepAliveIssued(): void;
}

/**
 * AppContext implementation used inside the runner-node sequence runtime.
 * Mirrors the behavior of the legacy `@scramjet/runner` `RunnerAppContext`
 * for the sequence-facing surface, but with tightened typing.
 */
export class RunnerAppContext<AppConfigType extends AppConfig, State, HubClientType = unknown, SpaceClientType = unknown>
implements AppContext<AppConfigType, State, HubClientType, SpaceClientType> {
    private runner: RunnerProxy;

    config: AppConfigType;
    AppError!: AppErrorConstructor;
    monitorStream: WritableStream<any>;
    emitter: EventEmitter;
    initialState?: State;
    exitTimeout = 10_000;
    logger: IObjectLogger;
    hub: HostClient;
    space: ManagerClient;
    private v2HubClient: HubClientType;
    private v2SpaceClient: SpaceClientType;
    instanceId: string;
    api: APIExpose;
    localStorage: ILocalStorage;

    constructor(
        config: AppConfigType,
        monitorStream: WritableStream<any>,
        emitter: EventEmitter,
        runner: RunnerProxy,
        hostClient: HostClient,
        spaceClient: ManagerClient,
        v2HubClient: HubClientType,
        v2SpaceClient: SpaceClientType,
        id: string,
        logLevel: LogLevel,
        api: APIExpose,
        localStorage: ILocalStorage
    ) {
        this.config = config;
        this.monitorStream = monitorStream;
        this.emitter = emitter;
        this.runner = runner;
        this.hub = hostClient;
        this.space = spaceClient;
        this.v2HubClient = v2HubClient;
        this.v2SpaceClient = v2SpaceClient;
        this.instanceId = id;
        this.api = api;
        this.localStorage = localStorage;
        this.logger = new ObjLogger(`App:${this.instanceId}`, {}, logLevel);
    }

    hubClient(): HubClientType {
        return this.v2HubClient;
    }

    spaceClient(): SpaceClientType {
        return this.v2SpaceClient;
    }

    private handleSave(_state: State): void {
        throw new Error("Method not implemented.");
    }

    private _killHandlers: KillHandler[] = [];

    killHandler(): void {
        for (const handler of this._killHandlers) handler();
    }

    addKillHandler(handler: KillHandler): this {
        assertFunction<KillHandler>(handler);
        this._killHandlers.push(handler);
        return this;
    }

    private _stopHandlers: StopHandler[] = [];

    async stopHandler(timeout: number, canCallKeepalive: boolean): Promise<void> {
        for (const handler of this._stopHandlers) {
            await handler(timeout, canCallKeepalive);
        }
    }

    addStopHandler(handler: StopHandler): this {
        assertFunction<StopHandler>(handler);
        this._stopHandlers.push(handler);
        return this;
    }

    private _monitoringHandlers: MonitoringHandler[] = [];

    async monitor(
        initialMessage: MonitoringMessageFromRunnerData = { healthy: true }
    ): Promise<MonitoringMessageFromRunnerData> {
        let message = initialMessage;

        for (const handler of this._monitoringHandlers) {
            const { healthy } = await handler(message);

            message = { healthy: message.healthy && healthy };
        }

        return message;
    }

    addMonitoringHandler(handler: MonitoringHandler): this {
        assertFunction<MonitoringHandler>(handler);
        this._monitoringHandlers.push(handler);
        return this;
    }

    private _definition: FunctionDefinition = { mode: "buffer", name: "anonymous function" };

    get definition(): FunctionDefinition {
        return this._definition;
    }

    describe(definition: FunctionDefinition): this {
        Object.assign(this._definition, definition);
        return this;
    }

    keepAlive(milliseconds?: number): this {
        this.runner.keepAliveIssued();
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

    on(eventName: string, handler: (message?: any) => void): this {
        this.emitter.on(eventName, handler);
        return this;
    }

    emit(eventName: string, message?: any): this {
        this.runner.sendEvent({ eventName, message, scope: "host" });
        return this;
    }

    emitToSpace(eventName: string, message?: any): this {
        this.runner.sendEvent({ eventName, message, scope: "space" });
        return this;
    }
}

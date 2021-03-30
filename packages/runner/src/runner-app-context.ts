import { RunnerMessageCode } from "@scramjet/model";
import { AppConfig, AppError, AppErrorConstructor, AutoAppContext, WritableStream } from "@scramjet/types";
import { EventEmitter } from "events";
import { MessageUtils } from "./message-utils";

export class RunnerAppContext<AppConfigType extends AppConfig, State extends any>
implements AutoAppContext<AppConfigType, State> {

    // definition?: FunctionDefinition[] | undefined;
    config: AppConfigType;
    AppError!: AppErrorConstructor;
    monitorStream: WritableStream<any>;;
    emitter: EventEmitter;

    constructor(config: AppConfigType, monitorStream: WritableStream<any>, emitter: EventEmitter) {
        this.config = config;
        this.monitorStream = monitorStream;
        this.emitter = emitter;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private handleSave(state: any): void {
        throw new Error("Method not implemented.");
    }

    private async handleStopSequence(err?: Error): Promise<void> {
        MessageUtils.writeMessageOnStream([RunnerMessageCode.SEQUENCE_STOPPED, { err }], this.monitorStream);
    }
    // monitor?: ((resp?: MonitoringMessage | undefined) => MaybePromise<MonitoringMessage>) | undefined;
    // stopHandler?: ((timeout: number, canCallKeepalive: boolean) => MaybePromise<void>) | undefined;
    // killHandler?: (() => void) | undefined;
    keepAlive(milliseconds?: number): this {
        MessageUtils.writeMessageOnStream([
            RunnerMessageCode.ALIVE, { keepAlive: milliseconds || 0 }
        ]);
        return this;
    }

    end() {
        //shoul d this method notify instance that the pocess is stopped?
        this.handleStopSequence();
        return this;
    }

    destroy(error?: AppError): this {
        this.handleStopSequence(error);
        return this;
    }

    save(state: State): this {
        this.handleSave(state);
        return this;
    }

    // initialState?: (State extends any ? any : any) | undefined;
    // on(ev: string, handler: (message?: any) => void): this;
    // on(ev: "error", handler: (message: Error) => void): this;
    on(eventName: string, handler: (message?: any) => void) {
        this.emitter.on(eventName, handler);
        return this;
    }
    // emit(ev: string, message?: any): this;

    emit(eventName: string, message: any) {
        MessageUtils.writeMessageOnStream([RunnerMessageCode.EVENT, { eventName, message }]);
        return this;
    }
}

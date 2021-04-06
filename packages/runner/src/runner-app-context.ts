import { RunnerMessageCode } from "@scramjet/model";
import { AppConfig, AppError, AppErrorConstructor, AppContext, EncodedMonitoringMessage, WritableStream, FunctionDefinition } from "@scramjet/types";
import { EventEmitter } from "events";
import { MessageUtils } from "./message-utils";

export class RunnerAppContext<AppConfigType extends AppConfig, State extends any>
implements AppContext<AppConfigType, State> {

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

    private notifyInstanceAboutStopping(err?: Error) {
        this.writeMonitoringMessage([RunnerMessageCode.SEQUENCE_STOPPED, { err }]);
    }

    private async writeMonitoringMessage(encodedMonitoringMessage: EncodedMonitoringMessage){
        MessageUtils.writeMessageOnStream(encodedMonitoringMessage, this.monitorStream);
    }

    handleKill(): this {
        throw new Error("Not yet implemented");
    }

    handleStop(): this {
        throw new Error("Not yet implemented");
    }

    handleMonitoring(): this {
        throw new Error("Not yet implemented");
    }

    get definition(): FunctionDefinition {
        throw new Error("Not yet implemented");
    }

    describe(): this {
        throw new Error("Not yet implemented");
    }

    keepAlive(milliseconds?: number): this {
        this.writeMonitoringMessage([
            RunnerMessageCode.ALIVE, { keepAlive: milliseconds || 0 }
        ]);
        return this;
    }

    end() {
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

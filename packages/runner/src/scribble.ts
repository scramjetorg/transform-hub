import { RunnerMessageCode } from "@scramjet/model";
import { AutoAppContext, Application } from "@scramjet/types";
import { ReadableStream } from "@scramjet/types/src/utils";
import { EncodedMonitoringMessage } from "@scramjet/types/src/message-streams";
import { WritableStream } from "@scramjet/types/src/utils";
import { DataStream } from "scramjet";

export class Runner {

    private monitor: WritableStream<EncodedMonitoringMessage>;

    getSequence() { return () => new DataStream(); }
    executeSequence() {
        const sequence: Application = this.getSequence();
        const args: any[] = [];
        const monitor = this.monitor;
        const context: AutoAppContext<any, any> = {
            keepAlive(keepAlive = 1000) {
                monitor.write([3010, { keepAlive }]);
                return this;
            },
            emit(eventName: string, message: any) {
                monitor.write([RunnerMessageCode.EVENT, { eventName, message }]);
                return this;
            },
            on(eventName: string, handler: (message?: any) => void) {
                
            }
        };

        sequence.call(
            context,
            new DataStream() as unknown as ReadableStream<never>,
            ...args
        );
    }

}

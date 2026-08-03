import { WritableStream } from "@scramjet/runtime-types";
import { EncodedMonitoringMessage } from "@scramjet/runtime-types";

export class MessageUtils {
    public static writeMessageOnStream([code, data]: EncodedMonitoringMessage, streamToWrite: WritableStream<any>) {
        if (streamToWrite === undefined) {
            throw new Error("The Stream is not defined.");
        }

        let frame: string;
        try {
            frame = JSON.stringify([code, data]);
            if (frame === undefined) throw new TypeError("monitoring frame is not serializable");
        } catch (error) {
            const message = error instanceof Error ? error.message.slice(0, 256) : "unknown serialization failure";
            frame = JSON.stringify([code, { healthy: false, error: { code: "ERR_MONITORING_SERIALIZATION", message } }]);
        }
        streamToWrite.write(frame + "\r\n");
    }
}

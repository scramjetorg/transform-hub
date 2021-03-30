import { EncodedMonitoringMessage, WritableStream } from "@scramjet/types";

export class MessageUtils {
    public static writeMessageOnStream([code, data]: EncodedMonitoringMessage, streamToWrite?: WritableStream<any>){
        if (streamToWrite === undefined) {
            throw new Error("The Stream is not defined.");
        }

        streamToWrite.write(JSON.stringify([code, data]) + "\r\n");
    }
}

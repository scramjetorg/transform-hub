import { Logger, ReadableStream, WritableStream } from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
export type dataType = {
    topic: string;
    contentType: string;
}

export class ServiceDiscovery {
    dataMap = new Map<string, { contentType: string, stream: ReadableStream<any> }>();
    logger: Logger = getLogger(this);

    addData(outputStream: ReadableStream<any>, config: dataType) {
        this.logger.log("Adding data:", config);
        if (!this.dataMap.has(config.topic)) {
            this.dataMap.set(config.topic, {
                contentType: config.contentType,
                stream: outputStream
            });
        }
    }

    getData(dataType: dataType, inputStream: WritableStream<any>): ReadableStream<any> | undefined {
        this.logger.log("Get data:", dataType);
        if (this.dataMap.has(dataType.topic)) {
            this.dataMap.get(dataType.topic)?.stream.pipe(inputStream);
        }

        return undefined;
    }
}

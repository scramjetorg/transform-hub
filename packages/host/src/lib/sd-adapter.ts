import { Logger, ReadableStream, WritableStream } from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
import { PassThrough, Stream } from "stream";
export type dataType = {
    topic: string;
    contentType: string;
}

export type streamType = {
    contentType: string;
    stream: Stream;
}

export class ServiceDiscovery {
    dataMap = new Map<string, { contentType: string, stream: ReadableStream<any> | WritableStream<any> }>();
    logger: Logger = getLogger(this);

    addData(outputStream: ReadableStream<any>, config: dataType) {
        this.logger.log("Adding data:", config);

        if (!this.dataMap.has(config.topic)) {
            this.dataMap.set(config.topic, {
                contentType: config.contentType,
                stream: outputStream.pipe(new PassThrough())
            });
        } else {
            outputStream.pipe(this.dataMap.get(config.topic)!.stream as WritableStream<any>);
        }
    }

    getTopics() {
        const o: any = [];

        this.dataMap.forEach((_v, k) => {
            o.push(k);
        });

        return o;
    }

    getByTopic(topic: string): streamType | undefined {
        if (this.dataMap.has(topic)) {
            return this.dataMap.get(topic);
        }

        return undefined;
    }

    getData(dataType: dataType, inputStream?: WritableStream<any>):
        ReadableStream<any> | WritableStream<any> | undefined {
        this.logger.log("Get data:", dataType);

        if (this.dataMap.has(dataType.topic)) {
            if (inputStream) {
                this.dataMap.get(dataType.topic)?.stream.pipe(inputStream);
            }

            return this.dataMap.get(dataType.topic)?.stream;
        }

        this.addData(new PassThrough(), dataType);

        return this.getData(dataType, inputStream);
    }

    removeData(topic: string) {
        if (this.dataMap.has(topic)) {
            // eslint-disable-next-line no-extra-parens
            (this.dataMap.get(topic)?.stream as ReadableStream<any>).unpipe();
            this.dataMap.delete(topic);
        }
    }
}

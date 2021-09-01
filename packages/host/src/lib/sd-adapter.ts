import { ReadableStream } from "@scramjet/types";
import { PassThrough } from "stream";

export class ServiceDiscovery {
    dataMap = new Map<string, ReadableStream<any>>();

    addData(stream: ReadableStream<any>, config: { topic: string, contentType: string }) {
        if (!this.dataMap.has(config.topic)) {
            this.dataMap.set(config.topic, stream);
        }
    }

    getData(id: string): ReadableStream<any> | undefined {
        if (this.dataMap.has(id)) {
            return this.dataMap.get(id);
        }

        const ps = new PassThrough();

        this.dataMap.set(id, ps);

        return ps;
    }
}

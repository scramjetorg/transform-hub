import * as http from "http";
import { IncomingMessage } from "http";
import { PassThrough } from "stream";
import { ReadableApp } from "@scramjet/types";
import { StringStream } from "scramjet";

const mockResponse = () => {
    const fakeData = new PassThrough();

    fakeData.write(Buffer.alloc(1024));

    return fakeData;
};
const startDate = Date.now();
const downloadFile = (url: string): Promise<IncomingMessage | PassThrough> => {
    return new Promise((resolve) => {
        http.get(url, (response: IncomingMessage) => {
            if (response.statusCode !== 200) {
                resolve(mockResponse());
            }

            resolve(response);
        }).on("error", () => {
            resolve(mockResponse());
        });
    });
};

let allocatedMem: Buffer;

/**
 * @param _stream - input
 * @param config sequence configuration
 * @returns data
 */
export = async function(_stream: any, ...args: any) {
    const allocMemSize = args[1];

    allocatedMem = Buffer.alloc(allocMemSize << 20, 0x1234);

    const stream = new StringStream();
    const durationMs = args[0] * 1000;
    const files = args[2];

    console.log(`Args: [Duration: ${durationMs}, MemAlloc: ${allocMemSize}, Files: ${files}]`);

    this.on("check", async (data) => {
        this.emit(
            "ok",
            {
                uptime: (Date.now() - startDate) / 1000,
                asked: data
            });
    });

    const loop = setInterval(async () => {
        try {
            // eslint-disable-next-line no-extra-parens
            (await Promise.all(
                files.map(downloadFile)
            ) as IncomingMessage[]).map((file: IncomingMessage) => {
                file.on("data", (chunk: Buffer) => {
                    chunk.copy(allocatedMem, ~~(Math.random() * (allocatedMem.length - chunk.length)));
                });
            });
        } catch (err) {
            console.log(err);
        }

        if (Date.now() - startDate > durationMs) {
            stream.end();
            clearInterval(loop);
        }
    }, 1000);

    return stream;
} as ReadableApp;


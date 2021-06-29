import * as http from "https";
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
 * @param allocMemSize preallocate memory
 * @param files list of files
 * @returns data
 */
export = async function(_stream: any, allocMemSize: string, files: string[] = [

]) {
    allocatedMem = Buffer.alloc((+allocMemSize || 400) << 20, 0x1234);

    const stream = new StringStream();

    console.log(`Args: MemAlloc: ${allocMemSize}, Files: ${files}]`);

    this.on("check", async (asked) => {
        const uptime = (Date.now() - startDate) / 1000;

        this.logger.log(`Check received: ${JSON.stringify(asked)}`);
        this.emit("ok", { uptime, asked });
    });

    setInterval(async () => {
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
    }, 1000);

    return stream;
} as ReadableApp;


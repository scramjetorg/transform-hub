import * as http from "http";
import { IncomingMessage } from "http";
import { PassThrough } from "stream";

const startDate = Date.now();
const downloadFile = (url: string): Promise<IncomingMessage> => {
    return new Promise((resolve, reject) => {
        http.get(url, (response: IncomingMessage) => {
            if (response.statusCode !== 200) {
                reject();
            }
            console.log("file downloaded:", response.statusCode, response.headers["content-length"]);
            resolve(response);
        });
    });
};

let allocatedMem: Buffer;

const exp = [
    /**
     * @param _stream - input
     * @param config sequence configuration
     * @returns data
     */
    (_stream: any, ...args: any) => {
        const allocMemSize = args[1];

        allocatedMem = Buffer.alloc(allocMemSize << 20);

        const stream = new PassThrough();
        const durationMs = args[0] * 1000;
        const files = args[2];

        console.log(`Args: [Duration: ${durationMs}, MemAlloc: ${allocMemSize}, Files: ${files}]`);

        const loop = setInterval(async () => {
            try {
                // eslint-disable-next-line no-extra-parens
                (await Promise.all(
                    files.map(downloadFile)
                ) as IncomingMessage[]).map((file: IncomingMessage) => {
                    file.on("data", (chunk: Buffer) => {
                        chunk.copy(allocatedMem, Math.random() * (allocMemSize << 20 - chunk.length));
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
    },

    async (stream: any) => {
        return stream;
    }
];

export = exp;

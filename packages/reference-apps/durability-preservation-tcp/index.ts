import * as https from "https";
import { IncomingMessage } from "http";
import { PassThrough } from "stream";
import { Logger, ReadableApp } from "@scramjet/types";
import { StringStream } from "scramjet";
import * as net from "net";

const mockResponse = () => {
    const fakeData = new PassThrough();

    fakeData.write(Buffer.alloc(1024));

    return fakeData;
};
const downloadFile = (url: string): Promise<IncomingMessage | PassThrough> => {
    return new Promise((resolve) => {
        https.get(url, (response: IncomingMessage) => {
            if (response.statusCode !== 200) {
                resolve(mockResponse());
            }

            resolve(response);
        }).on("error", () => {
            resolve(mockResponse());
        });
    });
};

let server: net.Server;
let lastItem = "";

const startServer = (logger: Logger) => {
    const port = 20000;

    server = net.createServer();

    server.on("close", () => {
        logger.info("TCP server at port " + port + "closed.");
    });

    server.on("error", function(error: any) {
        logger.error("TCP server error: " + error);
    });

    server.on("connection", function(socket: any) {
        logger.info("Socket connection at port: " + socket.localPort);

        socket.end(lastItem);
    });

    server.listen(port, () => {
        logger.info("TCP server listening at port: " + port);
    });
};

let allocatedMem: Buffer;

/**
 * @param _stream - input
 * @param config sequence configuration
 * @returns data
 */
export = async function(_stream: any, ...args: any) {
    const allocMemSize = args[0];

    allocatedMem = Buffer.alloc(allocMemSize << 20, 0x1234);

    const stream = new StringStream();
    const files = args[1];

    console.log(`Args: MemAlloc: ${allocMemSize}, Files: ${files}]`);

    startServer(this.logger);

    this.on("check", async (data) => {
        this.logger.log(`Check received: ${JSON.stringify(data)}`);
        lastItem = data;
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


/* eslint-disable no-console */
import test from "ava";
import { IncomingMessage, Server, createServer } from "http";
import { TeceMux, TeceMuxChannel } from "../src/lib/tecemux/tecemux";
import * as crypto from "crypto";
import { Socket, createConnection } from "net";
import { Readable } from "stream";

let serverTeceMux: TeceMux;

const PORT = 6660;

async function startServer() {
    const server = createServer({});

    return new Promise<Server>((resolve) => {
        server.listen(PORT, () => { resolve(server); });
    });
}

test("Protocol send file over http connection", async (t) => {
    const server = await startServer();

    const hashReceived = crypto.createHash("md5");
    const hashSent = crypto.createHash("md5");

    const serverSideChannelPromise = new Promise<TeceMuxChannel>((resolve) => {
        server.on("connect", async (req: IncomingMessage, socket: Socket) => {
            socket.setNoDelay(true);

            serverTeceMux = new TeceMux(socket, "Server")
                .on("error", (error) => {
                    console.error("TeceMux error", error);
                });

            resolve(serverTeceMux.multiplex());
        });
    });

    const socket = createConnection({ port: PORT, allowHalfOpen: true, host: "0.0.0.0" }, () => {});

    await new Promise((resolve, reject) => {
        socket
            .on("connect", resolve)
            .on("error", reject);
    });

    socket.write("CONNECT HTTP/1.1\r\n\r\n\r\n");

    const clientTeceMux = new TeceMux(socket, "Request");

    await new Promise<TeceMuxChannel>(resolve => {
        clientTeceMux.on("channel", async (clientSideChannel: TeceMuxChannel) => {
            function* gen() {
                for (let i = 0; i < 1e3; i++) {
                    const str = crypto.randomBytes(1024).toString("hex");

                    hashSent.update(str);
                    yield str;
                }
            }

            Readable.from(gen()).pipe(clientSideChannel);
            resolve(clientSideChannel);
        });
    });

    const serverSideChannel = await serverSideChannelPromise;

    for await (const d of serverSideChannel) {
        hashReceived.update(d);
    }

    console.dir({
        hashSent,
        hashReceived
    });

    t.assert(hashReceived.digest("hex") === hashSent.digest("hex"), "Unequal hashes");
});

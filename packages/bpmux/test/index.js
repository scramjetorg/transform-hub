const { Readable, Duplex, PassThrough } = require("stream");
const { BPMux } = require("..");
const { createServer, connect } = require("net");
const { join } = require("path");
const { rmSync } = require("fs");
const { setTimeout } = require("timers/promises");

const socketPath = join(__dirname, ".test.sock");

rmSync(socketPath, { force: true });

const mkPayload = (id) => {
    let n = 0
    return Readable.from(function* () {
        for (let i = 0; i < 10; i++) {
            setTimeout(10);
            yield JSON.stringify({ id, n: n++ })
        }
    }());
}

const srv = createServer(socket => {
    const mux = new BPMux(socket);
    mux._a = 1;

    let peers_left = 2;

    mux.on("error", (err) => console.error("mux error", err));
    mux.on("peer_multiplex", async (peer) => {
        for await (const data of peer) {
            console.log("data", data.toString());
            peer.write(`[${data}]`);
        }
        peer.on("error", (err) => {
            console.error("peer error", err);
        });
        peer.end();

        if (--peers_left === 0) {
            console.log("all peers closed");

            srv.close(() => rmSync(socketPath, { force: true }));
        }
    });
})
    .listen(socketPath)
    .on("listening", () => {
        const client = connect(socketPath, async () => {
            const mux = new BPMux(client);
            mux._a = 2;
            mux.on("error", (err) => console.error("cli error", err));

            const peer1 = mux.multiplex({ channel: 1001 })
                .on("data", (d) => console.log("peer1 data", d.toString()));
            const peer2 = mux.multiplex({ channel: 2002 })
                .on("data", (d) => console.log("peer2 data", d.toString()));

            console.log("SENDING");

            await Promise.all([
                new Promise((res, rej) => {
                    mkPayload("peer1").on("data", (data) => {
                        peer1.write(data);
                    })
                    .on("end", () => {
                        console.log("peer1 end");
                        peer1.end();
                        peer1.on("finish", () => {
                            console.log("peer1 finish");
                            res();
                        });
                    })
                    .on("error", (err) => {
                        rej(err);
                    })
                }),
                new Promise((res, rej) => {
                    mkPayload("peer2")
                    .on("data", (data) => {
                        peer2.write(data);
                    })
                    .on("end", () => {
                        console.log("peer2 end");
                        peer2.end();
                        peer2.on("finish", () => {
                            console.log("peer1 finish");
                            res();
                        });
                    })
                    .on("error", (err) => {
                        rej(err);
                    })
                })
            ]).catch((err) => {
                console.error("error", err);
            });

            console.log("ENDING");

            await setTimeout(100);

            client.end();
        });
    });

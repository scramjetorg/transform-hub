import { DataStream } from "scramjet";
import { FrameDecoder, FrameEncoder } from "./codecs";
import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { createReadStream, createWriteStream } from "fs";
import path from "path";
import { PassThrough, Transform } from "stream";
import { FramesKeeper } from "./frames-keeper";
import { ITeCeMux } from "./types";

const tcm = {
    sequenceNumber: 0,
    framesKeeper: new FramesKeeper()
} as ITeCeMux;

const logger = new ObjLogger("Sandbox");

logger.pipe(
    new DataStream()
        .map(prettyPrint({ colors: true }))
        .map((chunk: string) =>
            chunk.replace(
                /(:?FIN|SYN|RST|PSH|ACK|URG|ECE|CWR)|^$]/,
                "\x1b[41m\$&\x1b[0m"
            )
        )
)
    .pipe(process.stdout);

const encoder = new FrameEncoder(0, tcm);
const decoder = new FrameDecoder();

encoder.logger.pipe(logger);
decoder.logger.pipe(logger);

const ws = createWriteStream(path.join(__dirname, "output.tar.gz"));

const delayedPassThrough = () => new PassThrough({
    async transform(chunk, encoding, callback) {
        await new Promise((res, _rej) => {
            setTimeout(res, 1000);
        });

        this.push(chunk, encoding);
        callback(null);
    },
});

let t = 0;

const dh = new Transform({
    writableObjectMode: true,
    transform: (chunk, encoding, callback) => {
        try {
            if (chunk && chunk.length) {
                t = t + chunk.length;

                if (!ws.write(new Uint8Array(JSON.parse(chunk.toString()).chunk.data))) {
                    dh.pause();
                    ws.once("drain", () => {
                        callback();
                        dh.resume();
                    });
                } else {
                    callback(null);
                }
            }

            //callback(null);
        } catch (e) {
            logger.error("dh error", e);
        }
    }
});

createReadStream(path.join(__dirname, "../../../../forever.tar.gz"), { encoding: undefined })
    .pipe(encoder, { end: false }).out
    .pipe(delayedPassThrough())
    .pipe(decoder)
    .pipe(delayedPassThrough())
    .pipe(dh);

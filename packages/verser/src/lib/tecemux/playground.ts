import { DataStream } from "scramjet";
import { FrameEncoder } from "./codecs";
import { FrameDecoder } from "./codecs";
import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { createReadStream, createWriteStream } from "fs";
import path from "path";
import { Duplex, PassThrough, Transform } from "stream";
import { wrap } from "module";

const tcm = {
    sequenceNumber: 0
};

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

/*
process.stdin
    .pipe(encoder).out
    .pipe(decoder)
    //.pipe(process.stdout);
*/
let i = 0;
let t = 0;

const ws = createWriteStream(path.join(__dirname, "output.tar.gz"))

const delayedPassThrough = () => new PassThrough({
    async transform(chunk, encoding, callback) {
        await new Promise((res,_rej)=> {
            setTimeout(res, 1000);
        });
        this.push(chunk, encoding)
        callback(null)
    },
});

const dh = new Transform({ writableObjectMode: true, transform: (chunk, encoding, callback) => {
    try {
        console.log(i++, t);

        if (chunk && chunk.length) {
            t += chunk.length;

            console.log({ ...JSON.parse(chunk.toString()).chunk, });
            if (!ws.write(new Uint8Array(JSON.parse(chunk.toString()).chunk.data))) {
                dh.pause();
                ws.once("drain", () => {
                    callback();
                    dh.resume();
                })
            } else {
                callback(null);
            }
        }

        //callback(null);
    } catch (e) {
        debugger;
    }

}})

createReadStream(path.join(__dirname, "../../../../forever.tar.gz"), { encoding: undefined })
    .pipe(encoder, { end: false}).out

    .pipe(delayedPassThrough())
    .pipe(decoder)
    .pipe(delayedPassThrough())
    .pipe(dh)

    // .pipe(
    //     ws
    // )



import { Socket } from "net";
import { Readable, Writable } from "stream";

type HasSocket = {
    socket?: Socket;
};
const write = (what: string) => () => process.stdout.write(what);

export function observeReadable(x: Readable) {
    x.on("close", write("Rc\n"));
    x.on("end", write("Re"));
    x.on("error", write("R!"));
    x.on("pause", write("Rp"));
    x.on("resume", write("Rr"));
}

export function observeWritable(x: Writable) {
    x.on("drain", write("_"));
    x.on("close", write("Wc\n"));
    x.on("finish", write("Wf"));
    x.on("error", write("W!"));
}

export function observeSocket({ socket }: HasSocket) {
    socket?.on("connect", write("Se"));
    socket?.on("close", write("Sc\n"));
}

export function observe(x: Readable & Writable & HasSocket) {
    observeReadable(x);
    observeWritable(x);
    observeSocket(x);
}

import { ReReadable } from "rereadable-stream";
import { Readable, Transform } from "stream";

const prefixWithInstanceId = (instanceId: string) => new Transform({
    transform(chunk, encoding, done) {
        const chunkStr: string = chunk.toString("utf-8");

        chunkStr.trimEnd().split("\n").forEach((line: string) => {
            this.push(instanceId + ": " + line + "\n");
        });
        done();
    }
});

export class CommonLogsPipe {
    private outStream: ReReadable;

    constructor(bufferLength = 1e6) {
        this.outStream = new ReReadable({ length: bufferLength });
        // drain the outStream so that it never pauses instances streams
        this.outStream.rewind().resume();
    }

    public addInStream(instanceId: string, stream: Readable): void {
        stream
            .pipe(prefixWithInstanceId(instanceId))
            .pipe(this.outStream, { end: false });
    }

    get out(): Readable {
        return this.outStream.rewind();
    }
}

import { PassThrough, Readable, Transform } from "stream";

const prefixWithInstanceId = (instanceId: string) => new Transform({
    transform(chunk, encoding, done) {
        const chunkStr: string = chunk.toString("utf-8");

        chunkStr.trimEnd().split("\n").forEach((line: string) => {
            this.push(instanceId + ": " + line);
        });
        done();
    }
});

export class CommonLogsPipe {
    private outStream = new PassThrough()

    public addInStream(instanceId: string, stream: Readable): void {
        stream
            .pipe(prefixWithInstanceId(instanceId))
            .pipe(this.outStream, { end: false });
    }

    get out(): Readable {
        return this.outStream;
    }
}

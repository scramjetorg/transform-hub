import { PassThrough, Readable, Transform } from "stream";

const colors = ["[31m", "[32m", "[33m", "[34m", "[35m", "[36m", "[37m"];

const withColor = (txt: string, color: string) => `\x1b${color}${txt}\x1b[0m`;

const colorizeId = (instanceId: string): string => {
    const index = parseInt(instanceId.split("-")[0], 16) % colors.length;

    return withColor(instanceId, colors[index]);
};

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
    private outStream = new PassThrough()

    public addInStream(instanceId: string, stream: Readable): void {
        stream
            .pipe(prefixWithInstanceId(colorizeId(instanceId)))
            .pipe(this.outStream, { end: false });
    }

    get out(): Readable {
        return this.outStream;
    }
}

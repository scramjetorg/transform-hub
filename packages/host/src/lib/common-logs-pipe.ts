import { ReReadable } from "rereadable-stream";

import { Readable } from "stream";
import { StringStream } from "scramjet";

export class CommonLogsPipe {
    private outStream: ReReadable;

    constructor(bufferLength = 1e6) {
        this.outStream = new ReReadable({ length: bufferLength });
        // drain the outStream so that it never pauses the participating inStreams from instances
        this.outStream.rewind().on("data", () => {});
    }

    public addInStream(instanceId: string, stream: Readable): void {
        StringStream.from(stream)
            .lines()
            .prepend(`${instanceId}: `)
            .append("\n")
            .pipe(this.outStream, { end: false });
    }

    get out(): Readable {
        return this.outStream.rewind();
    }
}

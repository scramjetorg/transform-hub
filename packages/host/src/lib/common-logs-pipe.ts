import { ReReadable } from "rereadable-stream";

import { Readable, Writable } from "stream";
import { StringStream } from "scramjet";

export class CommonLogsPipe {
    private pipe: ReReadable;

    constructor(bufferLength = 1e6) {
        this.pipe = new ReReadable({ length: bufferLength });
        // drain the outStream so that it never pauses the participating inStreams from instances
        this.pipe.rewind().resume();
    }

    public addInStream(instanceId: string, stream: Readable): void {
        StringStream.from(stream)
            .lines()
            .prepend(`${instanceId}: `)
            .append("\n")
            .pipe(this.pipe, { end: false });
    }

    getIn(): Writable {
        return this.pipe;
    }

    getOut(): Readable {
        return this.pipe.rewind();
    }
}

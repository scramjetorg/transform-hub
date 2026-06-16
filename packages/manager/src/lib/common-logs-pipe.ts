import { ReReadable } from "rereadable-stream";

import { Readable, Writable } from "stream";
import { StringStream } from "scramjet";
import { ObjLogger } from "@scramjet/obj-logger";

export class CommonLogsPipe {
    private pipe: ReReadable;
    private readonly instreamPipes: Map<string, Readable> = new Map();

    logger = new ObjLogger(this);

    constructor(bufferLength = 1e5) {
        this.pipe = new ReReadable({ length: bufferLength });
        // drain the outStream so that it never pauses the participating inStreams from instances
        this.pipe.rewind().resume();
    }

    public addInStream(hostId: string, stream: Readable): void {
        const instream = StringStream.from(stream)
            .lines()
            .prepend(`${hostId}: `)
            .append("\n")
            .catch((_error: any) => { /* ignore errors */ });

        instream.pipe(this.pipe, { end: false });
        this.instreamPipes.set(hostId, instream);
    }

    public removeInStream(hostId: string): void {
        const instream = this.instreamPipes.get(hostId);

        if (instream) {
            instream.unpipe(this.pipe);
            this.instreamPipes.delete(hostId);
        }
    }

    getIn(): Writable {
        return this.pipe;
    }

    getOut(): Readable {
        const out = this.pipe.rewind();

        return out;
    }
}

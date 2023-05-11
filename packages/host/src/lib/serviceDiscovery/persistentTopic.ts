import { Readable, Writable } from "stream";
import { ContentType } from "./contentType";
import { StreamOrigin } from "./streamHandler";
import { Topic, TopicStreamOptions } from "./topic";
import TopicId from "./topicId";

class PersistentTopic extends Topic {
    instanceInput: Writable;
    instanceOutput: Readable;

    constructor(instanceInput: Writable, instanceOutput: Readable, id: TopicId,
        contentType: ContentType, origin: StreamOrigin,
        options?: TopicStreamOptions) {
        super(id, contentType, origin, options);

        this.instanceInput = instanceInput;
        this.instanceOutput = instanceOutput;

        const errorCb = (err: Error) => {
            this._errored = err;
            this.updateState();
        };

        this.instanceInput.on("error", errorCb);
        this.instanceOutput.on("error", errorCb);

        this.instanceOutput.on("data", (chunk:any) => {
            if (chunk === null) return;
            console.log(chunk.toString());
            if (!this.push(chunk))
                this.instanceOutput.pause();
        });
    }

    _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        this.needDrain = !this.instanceInput.write(chunk, encoding, callback);
        this.updateState();
    }

    _read(_size: number): void {
        console.log("PersistentTopic _read");
        if (this.instanceOutput.isPaused()) this.instanceOutput.resume();
    }

    resume(): this {
        super.resume();
        this.instanceOutput.resume();
        console.log("PersistentTopic resume", this.instanceOutput.readableFlowing);
        return this;
    }

    pause(): this {
        console.log("PersistentTopic pause", this.instanceOutput.isPaused(), this.instanceOutput.readableFlowing);
        super.pause();
        this.instanceOutput.pause();
        console.log("PersistentTopic pause2", this.instanceOutput.isPaused(), this.instanceOutput.readableFlowing);
        return this;
    }
}

export default PersistentTopic;

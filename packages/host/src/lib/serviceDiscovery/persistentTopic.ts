import { Readable, Writable } from "stream";
import { ContentType } from "./contentType";
import { ReadableState, StreamOrigin, WorkState, WritableState } from "./streamHandler";
import { Topic, TopicStreamOptions } from "./topic";
import TopicId from "./topicId";
import { TopicState } from "./topicHandler";

class PersistentTopic extends Topic {
    instanceInput: Writable;
    instanceOutput: Readable;

    constructor(instanceInput: Writable, instanceOutput: Readable, id: TopicId,
        contentType: ContentType, origin: StreamOrigin,
        options?: TopicStreamOptions) {
        super(id, contentType, origin, options);

        this.instanceInput = instanceInput;
        this.instanceOutput = instanceOutput;

        this.instanceOutput.on("readable", () => {
            this.pushFromOutStream();
        });

        this.instanceInput.on("drain", () => this.updateState());
        this.instanceOutput.on("pause", () => this.updateState());
        this.instanceOutput.on("resume", () => this.updateState());
        const errorCb = (err: Error) => {
            this._errored = err;
            this.updateState();
        };

        this.instanceInput.on("error", errorCb);
        this.instanceOutput.on("error", errorCb);
        this.on("error", errorCb);
    }
    // protected attachEventListeners() {
    // this.on("pipe", this.addProvider);
    // this.on("unpipe", this.removeProvider);
    // this.on(TopicEvent.ProvidersChanged, () => this.updateState());
    // this.on(TopicEvent.ConsumersChanged, () => this.updateState());
    // }
    state(): TopicState {
        if (this._errored) return WorkState.Error;
        if (this.instanceOutput.isPaused()
        //  || this.providers.size === 0 || this.consumers.size === 0
        )
            return ReadableState.Pause;
        if (this.needDrain) return WritableState.Drain;
        return WorkState.Flowing;
    }

    _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        this.needDrain = !this.instanceInput.write(chunk, encoding, callback);
    }
    _read(size: number): void {
        this.instanceOutput.read(size);
    }
    private pushFromOutStream(size?: number) {
        let chunk;

        while ((chunk = this.instanceOutput.read(size)) !== null) {
            // console.log("READ", chunk.toString());
            if (!this.push(chunk)) break;
        }
    }
}

export default PersistentTopic;

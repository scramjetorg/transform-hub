import BaseStreamWrapper from "./baseStreamWrapper";
import { ReadableState, StreamOptions, StreamOrigin, StreamType, WorkState } from "../serviceDiscovery/streamHandler";
import { Readable } from "stream";

type ReadableStreamState = WorkState | ReadableState

class ReadableStreamWrapper<R extends Readable> extends BaseStreamWrapper<R> {
    static create<WrappedStream extends Readable>(stream: WrappedStream, id: string, type: StreamType, origin: StreamOrigin, options: StreamOptions) {
        return new ReadableStreamWrapper(stream, { id, type, origin, options });
    }
    static retrive<WrappedStream extends Readable>(stream: WrappedStream) {
        const wrappedData = BaseStreamWrapper.retriveWrapperData(stream);
        return new ReadableStreamWrapper(stream, wrappedData);
    }

    state(): ReadableStreamState {
        if (this._stream.errored) return WorkState.Error;
        if (this._stream.closed) return WorkState.Close;
        if (this._stream.readableEnded) return ReadableState.End;
        if (this._stream.isPaused()) return ReadableState.Pause;
        if (this._stream.readable) return ReadableState.Readable;
        return WorkState.Flowing;
    }
}

export default ReadableStreamWrapper

import { Writable } from "stream";
import { BaseStreamWrapper } from "./baseStreamWrapper";
import { StreamOptions, StreamOrigin, StreamType, WorkState, WritableState } from "../serviceDiscovery/streamHandler";

type WritableStreamState = WorkState | WritableState

class WritableStreamWrapper<W extends Writable> extends BaseStreamWrapper<W> {
    static create<WrappedStream extends Writable>(stream: WrappedStream, id: string,
        type: StreamType, origin: StreamOrigin, options: StreamOptions) {
        return new WritableStreamWrapper(stream, { id, type, origin, options });
    }
    static retrive<WrappedStream extends Writable>(stream: WrappedStream) {
        const wrappedData = BaseStreamWrapper.retriveWrapperData(stream);

        return new WritableStreamWrapper(stream, wrappedData);
    }
    state(): WritableStreamState {
        if (this._stream.errored) return WorkState.Error;
        if (this._stream.closed) return WorkState.Close;
        if (this._stream.writableFinished) return WritableState.Finish;
        if (this._stream.writable) return WritableState.Writable;
        if (this._stream.writableNeedDrain) return WritableState.Drain;
        return WorkState.Flowing;
    }
}

export default WritableStreamWrapper;

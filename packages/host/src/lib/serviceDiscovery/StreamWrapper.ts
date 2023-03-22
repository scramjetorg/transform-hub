import { Stream } from "stream";
import { StreamHandler, StreamOptions, StreamType, StreamState } from "./StreamHandler";

class StreamWrapper<WrappedStream extends Stream> implements StreamHandler {
    protected _stream: WrappedStream

    protected constructor(stream: WrappedStream, name?: string, source?: StreamType, options?: StreamOptions) {
        this._stream = stream

        if (!StreamWrapper.hasWrapperData(stream)) {
            this.saveWrapperData(name || "", source || StreamType.Unknown, options);
        }
        this.attachStateChangeEvents();
    }

    static create<WrappedStream extends Stream>(stream: WrappedStream, name: string, source: StreamType, options: StreamOptions) {
        return new StreamWrapper(stream, name, source, options)
    }

    static retrive<WrappedStream extends Stream>(stream: WrappedStream) {
        if (!StreamWrapper.hasWrapperData(stream))
            throw new Error("Unknown stream data, can't retrive stream wrapper");
        return new StreamWrapper(stream);
    }

    name(): string { return (this._stream as any).wrapperData.name; }
    type(): StreamType { return (this._stream as any).wrapperData.source; };
    options(): StreamOptions { return (this._stream as any).wrapperData.options || {} }
    state(): StreamState {
        //TODO get state based on  writable readable stream params
        return (this._stream as any).wrapperData.state
    };

    stream() { return this._stream }

    protected static hasWrapperData<WrappedStream extends Stream>(stream: WrappedStream) { return "wrapperData" in stream }

    protected saveWrapperData(name: string, source: StreamType, options?: StreamOptions) {
        const wrapperData = { name, source, options };
        (this._stream as any).wrapperData = wrapperData;
    }

    protected attachStateChangeEvents() {
        //TODO: attach events
    }

}

export default StreamWrapper;
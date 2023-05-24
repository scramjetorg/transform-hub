import { Stream } from "stream";
import { StreamHandler, StreamOptions, StreamOrigin, StreamState, StreamType } from "../serviceDiscovery/streamHandler";

export type WrapperData = {
    id: string,
    type: StreamType,
    origin: StreamOrigin,
    options?: StreamOptions
}

export abstract class BaseStreamWrapper<WrappedStream extends Stream> implements StreamHandler {
    protected _stream: WrappedStream;

    constructor(stream: WrappedStream, wrapperData: WrapperData) {
        this._stream = stream;
        this.saveWrapperData(wrapperData);
    }

    id(): string { return (this._stream as any).wrapperData.id; }
    options(): StreamOptions { return (this._stream as any).wrapperData.options || {}; }
    origin(): StreamOrigin { return (this._stream as any).wrapperData.origin; }
    abstract state(): StreamState
    type(): StreamType { return (this._stream as any).wrapperData.type; }
    stream() { return this._stream; }

    static hasWrapperData<WrappedStream extends Stream>(stream: WrappedStream) { return "wrapperData" in stream; }
    static retriveWrapperData<WrappedStream extends Stream>(stream: WrappedStream): WrapperData {
        // TODO: Add after KM, remove return || default values
        // if (!this.hasWrapperData) throw new Error("Stream doesn't contain wrapper data");
        const wrappedData: WrapperData = (stream as any).wrapperData;

        return {
            id: wrappedData?.id || "",
            type: wrappedData?.type || "instance",
            origin: wrappedData?.origin || { id: "", type: "hub" },
            options: wrappedData?.options || {},
        };
    }

    protected saveWrapperData(wrapperData: WrapperData) {
        (this._stream as any).wrapperData = wrapperData;
    }
}

export default BaseStreamWrapper;

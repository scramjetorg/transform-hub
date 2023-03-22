export enum WorkState {
    Flowing = "flowing",
    Close = "close",
    Error = "error"
}

export enum WritableState {
    Finish = "finish",
    Writable = "writable",
    Drain = "drain"
}

export enum ReadableState {
    Readable = "readable",
    Pause = "pause",
    End = "end"
}

export type StreamState = WorkState | WritableState | ReadableState;

export enum StreamType {
    Instance = "instance",
    Topic = "topic",
    Api = "api"
}

export type StreamOptions = Record<string, any>;

export type OriginType = "space" | "hub"

export type StreamOrigin = {
    type: OriginType
    id: string;
}

export interface StreamHandler {
    id(): string
    state(): StreamState
    type(): StreamType
    options(): StreamOptions
    origin(): StreamOrigin
}

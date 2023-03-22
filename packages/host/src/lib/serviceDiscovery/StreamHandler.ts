import TopicName from "./topicName";

export enum StreamType {
    Instance = "instance",
    Api = "api",
    Topic = "topic",
    Host = "host",
    Unknown = "unknown"
    // Cpm = "cpm"
}

//TODO: wrocic tu przy laczeniu self hosted hub
export type TopicOptions = {
    name: TopicName;
    contentType: string
}

export type HostOptions = {
    hostId: string;
}

export enum WorkState {
    Initialized = "initialized",
    Waiting = "waiting",
    Flowing = "flowing",
    End = "end",
    Closed = "closed",
    Error = "error"
}

export enum WritableState {
    Finished = "finished",
    Writable = "writable",
    Drained = "drained",
    Closed = "closed",
}

export enum ReadableState {
    Readable = "readable",
    Paused = "paused",
}

export type StreamOptions = HostOptions | TopicOptions | Record<string, any>;
export type StreamState = WorkState | WritableState | ReadableState;

export interface StreamHandler {
    name(): string
    type(): StreamType
    options(): StreamOptions
    state(): StreamState
}

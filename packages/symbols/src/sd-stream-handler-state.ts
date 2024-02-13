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

export enum StreamType {
    Instance = "instance",
    Topic = "topic",
    Api = "api"
}

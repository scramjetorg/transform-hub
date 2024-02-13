import { WorkState, WritableState, ReadableState, StreamType } from "@scramjet/symbols";

export type StreamState = WorkState | WritableState | ReadableState;

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

export { WorkState, WritableState, ReadableState, StreamType };

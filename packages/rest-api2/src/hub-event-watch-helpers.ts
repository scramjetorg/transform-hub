import type { HubCursor, HubWatchKind } from "@scramjet/runtime-types";
import { HubWatchKindSchema, HubWatchOptions } from "./hub-event-watch-contract";

export function validateWatchOptions(kind: HubWatchKind, options: HubWatchOptions): AbortSignal | undefined {
    if (!HubWatchKindSchema.safeParse(kind).success) throw new TypeError("Unsupported Hub watch kind");
    if (!options || typeof options !== "object" || Array.isArray(options) || Object.keys(options).some(key => key !== "signal")) throw new TypeError("Invalid Hub watch options");
    const signal = options.signal;
    if (signal !== undefined && (!signal || typeof signal.aborted !== "boolean" || typeof signal.addEventListener !== "function" || typeof signal.removeEventListener !== "function")) throw new TypeError("Invalid Hub watch signal");
    return signal;
}

export function copyCursor(value: HubCursor): HubCursor {
    return Object.freeze({ hubId: value.hubId, epoch: value.epoch, position: value.position });
}

export function sameIdentity(left: HubCursor, right: HubCursor): boolean {
    return left.hubId === right.hubId && left.epoch === right.epoch;
}

export function sameCursor(left: HubCursor, right: HubCursor): boolean {
    return sameIdentity(left, right) && left.position === right.position;
}

export function abortError(): Error {
    const error = new Error("The watch was aborted");
    error.name = "AbortError";
    return error;
}

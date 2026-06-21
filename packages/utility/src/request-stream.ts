import { Readable, Transform, TransformCallback } from "stream";

type SocketLike = {
    bytesRead?: number;
    bytesWritten?: number;
    remoteAddress?: string;
    on?: (event: string, listener: (...args: any[]) => void) => unknown;
    once?: (event: string, listener: (...args: any[]) => void) => unknown;
};

type StreamLike = Partial<Readable> & {
    socket?: SocketLike;
    readableLength?: number;
    writableLength?: number;
    bytesRead?: number;
    bytesWritten?: number;
};

type ChunkLike = Buffer | string | { byteLength?: number; length?: number };

type ByteCounterStream = Transform & { getBytes: () => number };

function numericValue(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function chunkByteLength(chunk: ChunkLike): number {
    if (Buffer.isBuffer(chunk)) {
        return chunk.byteLength;
    }

    if (typeof chunk === "string") {
        return Buffer.byteLength(chunk);
    }

    return numericValue(chunk?.byteLength) ?? numericValue(chunk?.length) ?? 0;
}

export function getRequestBytesRead(request?: StreamLike, fallbackStream?: StreamLike): number {
    return numericValue(request?.socket?.bytesRead)
        ?? numericValue(fallbackStream?.bytesRead)
        ?? numericValue(request?.bytesRead)
        ?? 0;
}

export function getRequestBytesWritten(request?: StreamLike, fallbackStream?: StreamLike): number {
    return numericValue(request?.socket?.bytesWritten)
        ?? numericValue(fallbackStream?.bytesWritten)
        ?? numericValue(request?.bytesWritten)
        ?? 0;
}

export function getRequestRemoteAddress(request?: StreamLike): string | undefined {
    return request?.socket?.remoteAddress;
}

export function createByteCounterStream(): ByteCounterStream {
    let bytes = 0;
    const stream = new Transform({
        transform(chunk: ChunkLike, _encoding: BufferEncoding, callback: TransformCallback) {
            bytes += chunkByteLength(chunk);
            callback(null, chunk);
        }
    }) as ByteCounterStream;

    stream.getBytes = () => bytes;

    return stream;
}

export function onRequestSocketEvent(request: StreamLike | undefined, event: string, listener: (...args: any[]) => void): void {
    const socket = request?.socket;

    if (typeof socket?.once === "function") {
        socket.once(event, listener);
    } else if (typeof socket?.on === "function") {
        socket.on(event, listener);
    }
}

export function onRequestDisconnect(request: StreamLike | undefined, listener: (...args: any[]) => void): void {
    let handled = false;
    const once = () => {
        if (!handled) {
            handled = true;
            listener();
        }
    };

    for (const event of ["end", "close", "error"]) {
        onRequestSocketEvent(request, event, once);
    }

    for (const event of ["aborted", "close", "end", "error"]) {
        request?.once?.(event, once);
    }
}

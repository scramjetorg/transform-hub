import { Readable } from "stream";

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

function numericValue(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function streamByteLength(stream?: StreamLike): number | undefined {
    return numericValue(stream?.readableLength)
        ?? numericValue(stream?.writableLength)
        ?? numericValue(stream?.bytesRead)
        ?? numericValue(stream?.bytesWritten);
}

export function getRequestBytesRead(request?: StreamLike, fallbackStream?: StreamLike): number {
    return numericValue(request?.socket?.bytesRead)
        ?? streamByteLength(fallbackStream)
        ?? streamByteLength(request)
        ?? 0;
}

export function getRequestBytesWritten(request?: StreamLike, fallbackStream?: StreamLike): number {
    return numericValue(request?.socket?.bytesWritten)
        ?? streamByteLength(fallbackStream)
        ?? streamByteLength(request)
        ?? 0;
}

export function getRequestRemoteAddress(request?: StreamLike): string | undefined {
    return request?.socket?.remoteAddress;
}

export function trackStreamBytes(stream: StreamLike): () => number {
    let bytes = 0;

    stream.on?.("data", (chunk: ChunkLike) => {
        if (Buffer.isBuffer(chunk)) {
            bytes += chunk.byteLength;
        } else if (typeof chunk === "string") {
            bytes += Buffer.byteLength(chunk);
        } else {
            bytes += numericValue(chunk?.byteLength) ?? numericValue(chunk?.length) ?? 0;
        }
    });

    return () => bytes;
}

export function onRequestSocketEvent(request: StreamLike | undefined, event: string, listener: (...args: any[]) => void): void {
    const socket = request?.socket;

    if (typeof socket?.once === "function") {
        socket.once(event, listener);
    } else if (typeof socket?.on === "function") {
        socket.on(event, listener);
    }
}

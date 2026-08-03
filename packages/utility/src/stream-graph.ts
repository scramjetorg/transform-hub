import { Readable, Writable } from "stream";

export type StreamStatus = {
    type: "readable" | "writable" | "readable-writable" | "unknown";
    readable: boolean;
    writable: boolean;
    class: string;
    constructed?: string;
    piped?: string;
    length: number;
    errored: boolean;

    writableEnded?: boolean;
    writableCorked?: boolean;
    writableFinished?: boolean;
    writableLength?: number;

    readableDidRead?: boolean;
    readableEncoding?: boolean;
    readableEnded?: boolean;
    readableFlowing?: boolean;
    readableLength?: number;
}

export type NodeStream = Readable & Writable & {
    id?: string;
    constructed?: string;
    piped?: string;
    targets?: Set<NodeStream>;
    _readableState?: {
        pipes?: NodeStream | NodeStream[];
    }
};

export class StreamGraph {
    constructor(
        private readonly initial: Readable
    ) {}

    get graph() {
        const { streams, connections, circular } = StreamGraph.walkStream(this.initial as NodeStream);

        const streamIds = new Map<NodeStream, string>(streams.map((s, i) =>
            [s, s.id || `${s.readable ? "readable" : "writable"}-${i}`])
    );

        return {
            streams: streams.map((s) => ({
                id: streamIds.get(s)!,
                ...StreamGraph.streamStatus(s)
            })),
            connections: connections.map(([from, to]) => ({
                from: streamIds.get(from)!,
                to: streamIds.get(to)!
            })),
            circular: circular.map(s => streamIds.get(s)!)
        };
    }

    static walkStream(stream: NodeStream) {
        const streams = new Set<NodeStream>();
        const connections: [NodeStream, NodeStream][] = [];
        const circular: NodeStream[] = [];

        const walk = (s: NodeStream) => {
            if (streams.has(s)) {
                if (!circular.includes(s)) {
                    circular.push(s);
                }
                return;
            }
            streams.add(s);

            if (s._readableState?.pipes) {
                const pipes = Array.isArray(s._readableState.pipes) ? s._readableState.pipes : [s._readableState.pipes];

                for (const pipe of pipes) {
                    connections.push([s, pipe]);
                    walk(pipe);
                }
            }
            if (s.targets) {
                for (const target of s.targets) {
                    if (!streams.has(target)) {
                        connections.push([s, target]);
                        walk(target);
                    }
                }
            }
        };

        walk(stream);

        return {
            streams: Array.from(streams),
            connections,
            circular
        };
    }

    static isReadable(stream: Readable | Writable | NodeStream): stream is Readable {
        return stream instanceof Readable;
    }

    static isWritable(stream: Readable | Writable | NodeStream): stream is Writable {
        return stream instanceof Writable;
    }

    static streamStatus(stream: NodeStream): StreamStatus {
        const isReadable = this.isReadable(stream);
        const isWritable = this.isWritable(stream);

        const type = isReadable && isWritable ? "readable-writable"
            : isReadable ? "readable"
            : isWritable ? "writable"
            : "unknown";

        const length = (stream.readableLength ?? 0) + (stream.writableLength ?? 0);

        const status: StreamStatus = {
            constructed: stream.constructed,
            piped: stream.piped,
            class: stream.constructor.name,
            type,
            readable: isReadable && stream.readable,
            writable: isWritable && stream.writable,
            length,
            errored: !!stream.errored
        };

        if (isWritable) {
            status.writableEnded = stream.writableEnded;
            status.writableCorked = !!stream.writableCorked;
            status.writableFinished = stream.writableFinished;
            status.writableLength = stream.writableLength;
        }

        if (isReadable) {
            status.readableDidRead = stream.readableDidRead;
            status.readableEncoding = !!stream.readableEncoding;
            status.readableEnded = stream.readableEnded;
            status.readableFlowing = !!stream.readableFlowing;
            status.readableLength = stream.readableLength;
        }

        return status;
    }
}

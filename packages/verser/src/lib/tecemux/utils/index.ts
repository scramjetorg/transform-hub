export function toHex(chunk: Buffer) {
    return chunk.toString("hex").match(/../g)?.join(" ");
}

export const HEADER_LENGTH = 32;

export enum FrameTarget {
    API,
    INPUT = 1001
}

export type DecodedFrame = {
    sourceAddress: [number, number, number, number];
    destinationAddress: [number, number, number, number];
    destinationPort: number;
    chunk: {
        type: string;
        data: any;
    };
    dataLength: number;
    chunkLength: number;
    stringified: string;
};

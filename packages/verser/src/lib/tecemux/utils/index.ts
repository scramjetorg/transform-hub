import { binaryFlags, flagsObjectType } from "../codecs";

export function toHex(chunk: Buffer) {
    return chunk.toString("hex").match(/../g)?.join(" ");
}

export const HEADER_LENGTH = 32;

export enum FrameTarget {
    API,
    INPUT = 1001
}

export type FrameData = {
    sourceAddress: [number, number, number, number];
    destinationAddress: [number, number, number, number];
    destinationPort: number;
    sequenceNumber: number;
    acknowledgeNumber: number;
    chunk: Buffer;
    dataLength: number;
    chunkLength: number;
    stringified: string;
    flags: flagsObjectType;
    flagsArray: (keyof typeof binaryFlags)[];
};

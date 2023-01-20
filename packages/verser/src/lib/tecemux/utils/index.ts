import { binaryFlags, frameFlags } from "../constants";
import { flagsObjectType } from "../types";

export function toHex(chunk: Buffer) {
    return chunk.toString("hex").match(/../g)?.join(" ");
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

export const parseFlags = (byte: number): flagsObjectType => {
    return frameFlags.filter((_flag, index) => byte >>> index & 1)
        .reduce((p, c) => ({ ...p, [c]: true }), {});
};

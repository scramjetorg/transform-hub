export function toHex(chunk: Buffer) {
    return chunk.toString("hex").match(/../g)?.join(" ");
}

export const HEADER_LENGTH = 32;

export enum FrameTarget {
    API,
    INPUT = 1001
}

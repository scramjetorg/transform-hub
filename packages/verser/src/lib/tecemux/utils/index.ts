import { frameFlags } from "../constants";
import { flagsObjectType } from "../types";

export function toHex(chunk: Buffer) {
    return chunk.toString("hex").match(/../g)?.join(" ");
}

export const parseFlags = (byte: number): flagsObjectType => {
    return frameFlags.filter((_flag, index) => byte >>> index & 1)
        .reduce((p, c) => ({ ...p, [c]: true }), {});
};

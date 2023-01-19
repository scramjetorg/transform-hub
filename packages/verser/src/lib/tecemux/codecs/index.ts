import { Duplex } from "stream";

export * from "./frame-decoder";
export * from "./frame-encoder";

export type TeceMuxEvents = {
    channel(socket: Duplex): void;
    error(error: any): void;
}

export const binaryFlags = {
    FIN: 0b00000001,
    SYN: 0b00000010,
    RST: 0b00000100,
    PSH: 0b00001000,
    ACK: 0b00010000,
    URG: 0b00100000,
    ECE: 0b01000000,
    CWR: 0b10000000
}

export const frameFlags = Object.keys(binaryFlags);

export type flagsObjectType = Partial<{
    FIN: boolean,
    SYN: boolean,
    RST: boolean,
    PSH: boolean,
    ACK: boolean,
    URG: boolean,
    ECE: boolean,
    CWR: boolean
}>

export const parseFlags = (byte: number): flagsObjectType => {
    return frameFlags.filter((_flag, index) => byte >>> index & 1)
        .reduce((p, c) => ({ ...p, [c]: true }), {});
}

import { Duplex, Transform } from "stream";

export type TeceMuxEvents = {
    channel(socket: Duplex): void;
    error(error: any): void;
    peer(payload: { channelId: number }): void;
}

export type FramesKeeperEvents = {
    ack: (acknowledgeNumber: number) => void;
}

export type BinaryFlags = "FIN" | "SYN" | "RST" | "PSH" | "ACK" | "URG" | "ECE" | "CWR";

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

export type FramesKeeperFrame = {
    buffer: Buffer;
    received: boolean;
    sequenceNumber: number;
    destinationPort: number;
    flags: any
};

export interface IFramesKeeper {
    handleACK(acknowledgeNumber: number): void;
    isReceived(sequenceNumber: number): boolean;
    handlePSH(sequenceNumber: number): void;
    getFrame(sequenceNumber: number): FramesKeeperFrame | undefined;
    generator: AsyncGenerator<number, never, unknown>;
}

export interface ITeCeMux {
    sequenceNumber: number;
    framesSent: number;
    framesKeeper: IFramesKeeper;
}

export interface IFrameEncoder extends Transform {

}

export type TeceMuxChannel = Duplex & {
    _id: number;
    encoder: IFrameEncoder;
    closedByFIN: boolean;
};

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
    flagsArray: BinaryFlags[];
    error?: "checksum";
    received: boolean;
};
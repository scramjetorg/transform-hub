import { Duplex } from "stream";

export type TeceMuxEvents = {
    channel(socket: Duplex): void;
    error(error: any): void;
}

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
    onACK(acknowledgeNumber: number): void;
    isReceived(sequenceNumber: number): boolean;
    getFrame(sequenceNumber: number): FramesKeeperFrame | undefined
}

export interface ITeCeMux {
    sequenceNumber: number;
    framesKeeper: IFramesKeeper;
}

export interface IFrameEncoder {

}

export type TeceMuxChannel = Duplex & {
    _id: number,
    encoder: IFrameEncoder,
    closedByFIN: boolean
};

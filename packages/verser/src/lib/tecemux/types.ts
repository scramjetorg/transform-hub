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

export interface ITeCeMux {
    sequenceNumber: number;
}

export interface IFrameEncoder {

}

export type TeceMuxChannel = Duplex & {
    _id: number,
    encoder: IFrameEncoder,
    closedByFIN: boolean
};

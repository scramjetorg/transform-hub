export const binaryFlags = {
    FIN: 0b00000001,
    SYN: 0b00000010,
    RST: 0b00000100,
    PSH: 0b00001000,
    ACK: 0b00010000,
    URG: 0b00100000,
    ECE: 0b01000000,
    CWR: 0b10000000
};

export const frameFlags = Object.keys(binaryFlags);

export const HEADER_LENGTH = 32;

export enum FrameTarget {
    API,
    INPUT = 1001
}

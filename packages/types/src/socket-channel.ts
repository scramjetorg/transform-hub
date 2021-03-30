import { Socket } from "net";

export enum SocketChannel {
    STDIN,
    STDOUT,
    STDERR,
    CONTROL,
    MONITORING,
    TO_SEQ,
    FROM_SEQ,
    PACKAGE
}

export type BPMuxChannel = Socket & { _chan: string }

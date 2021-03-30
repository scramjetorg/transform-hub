import { Socket } from "net";

export enum SocketChannel {
    STDIN,
    STDOUT,
    STDERR,
    CONTROL,
    MONITORING,
    PACKAGE,
    TO_SEQ,
    FROM_SEQ
}

export type BPMuxChannel = Socket & { _chan: string }

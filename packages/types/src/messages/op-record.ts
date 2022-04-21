import { OpRecordCode } from "@scramjet/symbols";

export type OpRecord = {
    opCode: OpRecordCode;
    requestId: string;
    requestorId: string;
    requestorIP?: string;
    receivedAt: number;
    endedAt?: number;
    objectId: string;
    objectType: string;
    tx?: number;
    rx?: number;
    requestedURL?: string;

}


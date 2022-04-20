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
    bytesWritten?: number;
    bytesRead?: number;
    requestedURL?: string;

}


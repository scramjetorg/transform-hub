import { CPMMessageCode, SequenceMessageCode } from "@scramjet/symbols";

export type SequenceMessageData = {
    id: string,
    status: SequenceMessageCode
}

export type SequenceMessage = { msgCode: CPMMessageCode.SEQUENCE } & SequenceMessageData;
export type SequenceBulkMessage = { msgCode: CPMMessageCode.SEQUENCES, sequences: SequenceMessageData[] };


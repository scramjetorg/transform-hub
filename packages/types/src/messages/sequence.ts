import { CPMMessageCode, SequenceMessageCode } from "@scramjet/symbols";
import { ISequence } from "../sequence-store";

export type SequenceMessageData = {

    sequence: ISequence,
    status: SequenceMessageCode;
}

export type SequenceMessage = { msgCode: CPMMessageCode.SEQUENCE } & SequenceMessageData;
export type SequenceBulkMessage = { msgCode: CPMMessageCode.SEQUENCES, sequences: SequenceMessageData[] };


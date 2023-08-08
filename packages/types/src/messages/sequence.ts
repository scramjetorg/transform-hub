import { CPMMessageCode, SequenceMessageCode } from "@scramjet/symbols";
import { SequenceConfig } from "../runner-config";

export type SequenceMessageData = {
    id: string,
    status: SequenceMessageCode,
    config: SequenceConfig
}

export type SequenceMessage = { msgCode: CPMMessageCode.SEQUENCE } & SequenceMessageData;
export type SequenceBulkMessage = { msgCode: CPMMessageCode.SEQUENCES, sequences: SequenceMessageData[] };


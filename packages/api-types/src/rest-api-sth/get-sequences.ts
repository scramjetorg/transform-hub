import { SequenceConfig } from "@scramjet/runtime-types";

export type GetSequencesResponse = {
    instances: readonly string[];
    id: string;
    config: SequenceConfig;
}[]

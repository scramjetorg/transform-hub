import { SequenceConfig } from "../runner-config";

export type GetSequencesResponse = {
    instances: readonly string[];
    id: string;
    config: SequenceConfig;
}[]

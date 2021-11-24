import { SequenceConfig } from "../..";

export type SequenceDTO = {
    instances: readonly string[];
    id: string;
    config: SequenceConfig;
}
import { SequenceConfig } from "../../runner-config";

export type SequenceDTO = {
    instances: readonly string[];
    id: string;
    config: SequenceConfig;
}

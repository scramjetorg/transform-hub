import { SequenceConfig } from "../runner-config";

export type GetSequenceResponse = {
    id: string;
    config: SequenceConfig,
    instances: string[]
}

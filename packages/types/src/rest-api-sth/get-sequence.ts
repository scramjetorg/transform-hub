import { SequenceConfig } from "../runner-config";

export type GetSequenceResponse = {
    id: string;
    name?: string;
    config: SequenceConfig,
    instances: readonly string[]
}

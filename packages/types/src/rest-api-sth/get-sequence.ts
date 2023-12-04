import { SequenceConfig } from "../runner-config";

export type GetSequenceResponse = {
    id: string;
    parent_id: string;
    name?: string;
    config: SequenceConfig,
    location: string,
    instances: readonly string[]
}

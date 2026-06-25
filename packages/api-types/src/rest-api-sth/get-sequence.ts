import { SequenceConfig } from "@scramjet/runtime-types";

export type GetSequenceResponse = {
    id: string;
    name?: string;
    config: SequenceConfig,
    location: string,
    instances: readonly string[]
}

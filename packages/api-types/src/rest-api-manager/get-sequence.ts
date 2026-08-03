import { SequenceConfig } from "@scramjet/runtime-types";

export type GetSequenceResponse = {
    instances: string[];
    name?: string;
    id: string;
    config: SequenceConfig;
    location : string;
}

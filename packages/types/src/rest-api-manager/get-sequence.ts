import { SequenceConfig } from "../runner-config";

export type GetSequenceResponse = {
    instances: string[];
    name?: string;
    id: string;
    config: SequenceConfig;
    location : string;
}

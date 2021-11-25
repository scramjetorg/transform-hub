
import { SequenceConfig } from "../runner-config";

// @TODO error response should be handled properly, we shouldn't send "undefined"
export type GetSequenceResponse = {
    instances: readonly string[];
    id: string;
    config: SequenceConfig;
} | undefined

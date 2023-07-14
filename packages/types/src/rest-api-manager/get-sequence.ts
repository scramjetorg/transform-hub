import { InstanceId } from "../instance";
import { SequenceConfig } from "../runner-config";

export type GetSequenceResponse = {
    instances?: Set<InstanceId>;
    name?: string;
    id: string;
    config: SequenceConfig;
    location : string;
}

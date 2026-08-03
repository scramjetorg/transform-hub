import { Instance, DeepPartial } from "@scramjet/runtime-types";
import { GetSequenceResponse } from "./get-sequence";

export type GetInstanceResponse = Instance & {
    sequence: DeepPartial<GetSequenceResponse>
    /** Public instance label (optional) */
    instanceName?: string
};

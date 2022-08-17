import { Instance } from "../instance-store";
import { DeepPartial } from "../utils";
import { GetSequenceResponse } from "./get-sequence";

export type GetInstanceResponse = Instance & {
    sequenceInfo: DeepPartial<GetSequenceResponse>
};

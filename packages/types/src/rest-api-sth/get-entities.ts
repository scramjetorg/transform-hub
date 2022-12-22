import { GetInstancesResponse } from "./get-instances";
import { GetSequencesResponse } from "./get-sequences";

export type GetEntitiesResponse = {
    instances: GetInstancesResponse;
    sequences: GetSequencesResponse;
}

import { GetInstancesResponse } from "./get-instances";
import { GetSequencesResponse } from "./get-sequences";
import { GetTopicsResponse } from "./get-topics";

export type GetEntitiesResponse = {
    instances: GetInstancesResponse;
    sequences: GetSequencesResponse;
    topics: GetTopicsResponse;
}

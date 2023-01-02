import { GetEntitiesResponse as STHRestAPIGetEntitiesResponse } from "../rest-api-sth";

export type GetEntitiesResponse =
    (STHRestAPIGetEntitiesResponse & { hostId: string })[]

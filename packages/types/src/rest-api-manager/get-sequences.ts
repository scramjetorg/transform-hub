import { Pagination } from "./common";
import { GetSequenceResponse } from "./get-sequence";

export type GetSequencesResponse = Pagination & { data: GetSequenceResponse[]}

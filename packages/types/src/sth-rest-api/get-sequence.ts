import { SequenceDTO } from "./data-transfer-objects";

// @TODO error response should be handled properly, we shouldn't send "undefined"
export type GetSequenceResponse = SequenceDTO | undefined

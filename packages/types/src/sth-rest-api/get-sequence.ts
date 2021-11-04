import { ISequence } from "../sequence-store";

// @TODO error response should be handled properly, we shouldn't send "undefined"
export type GetSequenceResponse = ISequence | undefined

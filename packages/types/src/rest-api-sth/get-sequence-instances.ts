import { ReasonPhrases } from "http-status-codes";

export type GetSequenceInstancesResponse = readonly string[]
    | {
        opStatus: Exclude<ReasonPhrases, ReasonPhrases.OK | ReasonPhrases.ACCEPTED>,
        error?: string | Error | unknown
    };

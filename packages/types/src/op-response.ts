import { ReasonPhrases } from "http-status-codes";

export type OpResponse<PayloadType extends Record<string, unknown>> =
    | (PayloadType & {
        opStatus: ReasonPhrases.OK | ReasonPhrases.ACCEPTED,
        message?: string
    })
    | {
        opStatus: Exclude<ReasonPhrases, ReasonPhrases.OK | ReasonPhrases.ACCEPTED>,
        error?: string | Error | unknown
    }

import { ReasonPhrases } from "http-status-codes";

export type OpResponse<PayloadType extends Record<string, unknown>> =
| (PayloadType & { opStatus: ReasonPhrases.OK | ReasonPhrases.ACCEPTED })
| { opStatus: Exclude<ReasonPhrases, ReasonPhrases.OK | ReasonPhrases.ACCEPTED>, error?: unknown }

export type ControlMessageResponse = {
    accepted: ReasonPhrases.OK | ReasonPhrases.ACCEPTED,
}

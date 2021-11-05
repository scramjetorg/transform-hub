import { ReasonPhrases } from "http-status-codes";

export type OpResponse<PayloadType extends Record<string, unknown>> =
| (PayloadType & { opStatus: ReasonPhrases.OK })
| { opStatus: Exclude<ReasonPhrases, ReasonPhrases.OK>, error?: unknown }


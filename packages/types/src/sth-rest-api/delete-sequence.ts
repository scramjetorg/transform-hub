import { ReasonPhrases } from "http-status-codes";

export type DeleteSequenceResponse =
| {
    opStatus: ReasonPhrases.OK,
    id: number
}
| {
    opStatus: Omit<ReasonPhrases, ReasonPhrases.OK>,
    error?: string;
}

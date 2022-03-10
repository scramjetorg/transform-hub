import { ReasonPhrases } from "http-status-codes";

export type ControlMessageResponse = {
    accepted: ReasonPhrases.OK | ReasonPhrases.ACCEPTED,
}

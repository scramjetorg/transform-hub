import { ReasonPhrases } from "http-status-codes";

export type HubDeleteResponse = {
    opStatus: ReasonPhrases;
} | {
    opStatus: ReasonPhrases;
    error: any;
};

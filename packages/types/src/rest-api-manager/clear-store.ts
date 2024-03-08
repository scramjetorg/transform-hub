import { ReasonPhrases } from "http-status-codes";

export type StoreClearResponse = {
    opStatus: ReasonPhrases;
} | {
    opStatus: ReasonPhrases;
    error: any;
};

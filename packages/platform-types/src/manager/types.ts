import { DeepPartial, ManagerConfiguration } from "@scramjet/types";

type ResponseStatus = { opStatus?: string };

export type StartManagerRequestParams = DeepPartial<ManagerConfiguration>;
export type StartManagerRequestResponse = {
    id: string
} & ResponseStatus;

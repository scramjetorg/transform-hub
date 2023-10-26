import { AppConfig } from "../app-config";

export type StartSequenceDTO = {
    id: string,
    appConfig?: AppConfig,
    args?: string[],
    instanceId?: string;
}

export type StartSequenceEndpointPayloadDTO = {
    appConfig?: AppConfig,
    instanceId?: string;
    args?: string[],
}

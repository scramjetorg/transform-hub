import { AppConfig } from "../app-config";
import { LogLevel } from "../object-logger";

export type StartSequenceDTO = {
    id: string,
    name?: string,
    appConfig?: AppConfig,
    args?: string[],
    instanceId?: string;
    exposePath?: string;
    logLevel?: LogLevel;
}

export type StartSequenceEndpointPayloadDTO = {
    appConfig?: AppConfig,
    instanceId?: string;
    args?: string[],
    logLevel?: LogLevel;
}

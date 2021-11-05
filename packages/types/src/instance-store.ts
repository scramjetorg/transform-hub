import { AppConfig } from "./app-config";

export type Instance = {
    id: string,
    appConfig?: AppConfig,
    sequenceArgs?: any[],
    sequence: string,
    created?: Date,
    started?: Date
}

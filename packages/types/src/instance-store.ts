import { AppConfig } from "./app-config";

export type Instance = {
    id: string,
    appConfig?: AppConfig,
    sequenceArgs?: any[],
    sequence: string,
    ports?: Record<string, number>
    created?: Date,
    started?: Date,
    ended?: Date,
}

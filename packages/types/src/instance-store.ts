import { AppConfig } from "./app-config";

export interface IInstance {
    id: string,
    appConfig?: AppConfig,
    sequenceArgs?: any[],
    sequence: {},
    created?: Date,
    started?: Date
}

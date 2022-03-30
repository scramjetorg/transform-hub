import { AppConfig } from "../app-config";

export type StartSequenceResponse = { id: string }

export type StartSequencePayload = { appConfig: AppConfig, args?: any[], outputTopic?: string }

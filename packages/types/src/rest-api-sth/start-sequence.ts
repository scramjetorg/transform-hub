import { AppConfig } from "../app-config";

export type StartSequenceResponse = { result: "success", id: string } | { result: "error", error: unknown }

export type StartSequencePayload = {
    appConfig: AppConfig,
    args?: any[],
    outputTopic?: string,
    inputTopic?: string
}

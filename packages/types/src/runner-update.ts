import { AppConfig } from "./app-config";
import { LogLevel } from "./object-logger";

export type RunnerUpdateInfo = Partial<{
    appConfig: AppConfig;
    outputTopic: string;
    inputTopic: string;
    logLevel: LogLevel;
}>;

import { AppConfig } from "./app-config";
import { InstanceLimits } from "./instance-limits";
import { LogLevel } from "./object-logger";

export type RunnerConnectInfo = {
    appConfig: AppConfig;
    args?: any[];
    outputTopic?: string;
    inputTopic?: string;
    limits?: InstanceLimits;
    instanceId?: string;
    exposePath?: string;
    exposeHost?: string;
    exposePort?: number;
    system?: Record<string, string>;
    logLevel?: LogLevel;
}

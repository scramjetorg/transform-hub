import { AppConfig } from "./app-config";
import { InstanceLimits } from "./instance-limits";

export type RunnerConnectInfo = {
    appConfig: AppConfig;
    args?: any[];
    outputTopic?: string;
    inputTopic?: string;
    limits?: InstanceLimits;
    instanceId?: string;
    system?: Record<string, string>;
}

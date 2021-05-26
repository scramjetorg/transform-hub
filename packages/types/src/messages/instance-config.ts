import { SupervisorMessageCode } from "@scramjet/symbols";
import { RunnerConfig } from "../runner-config";

export type InstanceConfigMessageData = {
    config: RunnerConfig;
}

export type InstanceConfigMessage = { msgCode: SupervisorMessageCode.CONFIG } & InstanceConfigMessageData;

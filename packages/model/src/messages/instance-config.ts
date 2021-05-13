import { RunnerConfig } from "@scramjet/types";
import { SupervisorMessageCode } from "@scramjet/symbols";

export type InstanceConfigMessageData = {
    config: RunnerConfig;
}

export type InstanceConfigMessage = { msgCode: SupervisorMessageCode.CONFIG } & InstanceConfigMessageData;

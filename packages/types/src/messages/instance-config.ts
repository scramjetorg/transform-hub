import { SupervisorMessageCode } from "@scramjet/symbols";
import { InstanceConifg } from "../runner-config";

export type InstanceConfigMessageData = {
    config: InstanceConifg;
}

export type InstanceConfigMessage = { msgCode: SupervisorMessageCode.CONFIG } & InstanceConfigMessageData;

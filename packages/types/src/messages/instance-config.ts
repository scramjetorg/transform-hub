import { SupervisorMessageCode } from "@scramjet/symbols";
import { InstanceConifg } from "..";

export type InstanceConfigMessageData = {
    config: InstanceConifg;
}

export type InstanceConfigMessage = { msgCode: SupervisorMessageCode.CONFIG } & InstanceConfigMessageData;

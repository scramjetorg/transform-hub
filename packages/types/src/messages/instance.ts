import { CPMMessageCode, InstanceMessageCode } from "@scramjet/symbols";
import { Instance } from "../instance-store";

export type InstanceMessageData = {
    status: InstanceMessageCode;
    instance: Instance;
    //id : string
}

export type InstanceMessage = { msgCode: CPMMessageCode.INSTANCE } & InstanceMessageData;
export type InstanceBulkMessage = { msgCode: CPMMessageCode.INSTANCES, instances: InstanceMessageData[] };

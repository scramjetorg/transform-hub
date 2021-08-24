import { CPMMessageCode, InstanceMessageCode } from "@scramjet/symbols";

export type InstanceMessageData = {
    id: string;
    sequence: string;
    status: InstanceMessageCode;
}

export type InstanceMessage = { msgCode: CPMMessageCode.INSTANCE } & InstanceMessageData;
export type InstanceBulkMessage = { msgCode: CPMMessageCode.INSTANCES, instances: InstanceMessageData[] };

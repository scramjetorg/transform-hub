import { CPMMessageCode } from "@scramjet/symbols";

export type STHIDMessageData = {
    id: string;
}

export type CPMMessageSTHID = { msgCode: CPMMessageCode.STH_ID } & STHIDMessageData;

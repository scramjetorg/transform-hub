import { RunnerMessageCode } from "@scramjet/symbols";

export type STHIDMessageData = {

    id: string;
}

export type MonitoringRateMessage = { msgCode: RunnerMessageCode.STH_ID } & STHIDMessageData;

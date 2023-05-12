import { CPMMessageCode } from "@scramjet/symbols";

export type ConfirmMessage = {

    id: string;
}

export type CPMMessageConfirm = { msgCode: CPMMessageCode.STH_ID } & ConfirmMessage;

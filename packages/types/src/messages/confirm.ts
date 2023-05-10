import { CPMMessageCode } from "@scramjet/symbols";

export type ConfirmMessage = {
    id: string;
}

export type CPMMessageSTHID = { msgCode: CPMMessageCode.STH_ID } & ConfirmMessage;

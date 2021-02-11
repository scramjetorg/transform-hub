import { RunnerMessageCode } from "@scramjet/types";

export type ConfirmHealthMessageData = {}

/**
 * Message forcing Runner to emit a keep alive message.
 * It is used when Supervisor does not receive a keep alive message from Runner withih a specified time frame.
 * It forces Runner to emit a keep alive message to confirm it is still active.
 * This message type is sent from Supervisor.
 */
export type ConfirmHealthMessage = { msgCode: RunnerMessageCode.FORCE_CONFIRM_ALIVE } & ConfirmHealthMessageData;

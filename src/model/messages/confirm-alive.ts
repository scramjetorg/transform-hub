import { RunnerMessageCode } from "@scramjet/types";

/**
 * Message forcing Runner to emit a keep alive message.
 * It is used when Supervisor does not receive a keep alive message from Runner withih a specified time.
 * It forces Runner to emit a keep alive message to confirm it is active.
 * This message type is sent from Supervisor.
 */
export interface ConfirmAliveMessage {
    msgCode: RunnerMessageCode
}
import { RunnerMessageCode } from "@scramjet/symbols";

export type KeepAliveMessageData = {

    /** Information on how much longer the Sequence will be active (in milliseconds). */
    keepAlive: number;
}

/**
 * Message instructing how much longer to keep Sequence alive.
 * This message type is sent from Runner.
 */
export type KeepAliveMessage = { msgCode: RunnerMessageCode.ALIVE } & KeepAliveMessageData;

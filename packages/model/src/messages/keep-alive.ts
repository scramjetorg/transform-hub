import { RunnerMessageCode } from "@scramjet/types";

export type KeepAliveMessageData = {

    /** Information on how much longer the Sequence will be active (in miliseconds). */
    keepAlive: number;
}

/**
 * Message instrucing how much longer to keep Sequence alive.
 * This message type is sent from Runner.
 */
export type KeepAliveMessage = { msgCode: RunnerMessageCode.ALIVE } & KeepAliveMessageData;

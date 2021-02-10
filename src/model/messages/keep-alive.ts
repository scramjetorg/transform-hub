import { RunnerMessageCode } from "@scramjet/types";

/**
 * Message instrucing how much longer to keep Sequence alive.
 * This message type is sent from Runner.
 */
export interface KeepAliveMessage {

    /** Message type code from RunnerMessageCode enumeration. */
    msgCode: RunnerMessageCode,

    /** Information on how much longer the Sequence will be active (in miliseconds). */
    keepAlive: number;
}

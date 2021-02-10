import { RunnerMessageCode } from "@scramjet/types";

/**
 * Message instrucing how much longer to keep Sequence alive.
 * This message type is sent from Runner.
 */
export interface KeepAliveMessage {
    msgCode: RunnerMessageCode,
    keepAlive: number;
}

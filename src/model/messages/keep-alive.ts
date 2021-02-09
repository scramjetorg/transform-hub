import { BaseMessage } from "./base-message";

/**
 * Message instrucing how much longer to keep Sequence alive.
 * This message type is sent from Runner.
 */
export interface KeepAliveMessage extends BaseMessage {
    keepAlive: number;
}

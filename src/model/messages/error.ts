import { BaseMessage } from "./base-message";

/**
 * Error message
 * This message type is sent from Runner.
 */
export interface ErrorMessage extends BaseMessage {
    exitCode: number;
    message: string;
    errorCode: number;
    stacktrace: string;
}
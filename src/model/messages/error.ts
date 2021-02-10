import { RunnerMessageCode } from "@scramjet/types";

/**
 * Error message
 * This message type is sent from Runner.
 */
export interface ErrorMessage {
    msgCode: RunnerMessageCode,
    exitCode: number;
    message: string;
    errorCode: number;
    stacktrace: string;
}
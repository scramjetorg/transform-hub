import { RunnerMessageCode } from "@scramjet/types";

/**
 * A general purpose error message.
 * This message type is sent from Runner.
 */
export interface ErrorMessage {

    /** Message type code from RunnerMessageCode enumeration */
    msgCode: RunnerMessageCode,

    /** The operation's exit code. */
    exitCode: number;

    /** Error message. */
    message: string;

    /** Error's status code */
    errorCode: number;

    /** Error stack trace. */
    stacktrace: string;
}
import { RunnerMessageCode } from "@scramjet/symbols";

export type ErrorMessageData = {

    /** The operation's exit code. */
    exitCode: number;

    /** Error message. */
    message: string;

    /** Error's status code */
    errorCode: number;

    /** Error stack trace. */
    stack: string;
}

/**
 * A general purpose error message.
 * This message type is sent from Runner.
 */
export type ErrorMessage = { msgCode: RunnerMessageCode.ERROR } & ErrorMessageData;

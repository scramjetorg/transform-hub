
import { RunnerMessageCode } from "../.";

/**
 * Message indicating whether the command message (e.g. stop or kill) was received.
 * Optionally, it can indicate if the command was performed successfully, or
 * (in case of issues) attach a related error description.
 * This message type is sent from Runner.
 */
export type Message = {

    /** Message type code from RunnerMessageCode enumeration. */
    msgCode: RunnerMessageCode
}

export type EmptyMessageData = {};

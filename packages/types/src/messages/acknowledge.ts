import { ErrorMessage } from "./error";
import { RunnerMessageCode } from "@scramjet/symbols";

export type AcknowledgeMessageData = {

    /** Indicates whether a message was received. */
    acknowledged: boolean;

    /** Indicates status of the performed operation. */
    status?: number;

    /** Describes an error message if error was thrown after performing a requested operation. */
    errorMsg?: ErrorMessage;
}

/**
 * Message indicating whether the command message (e.g. stop or kill) was received.
 * Optionally, it can indicate if the command was performed successfully, or
 * (in case of issues) attach a related error description.
 * This message type is sent from Runner.
 */
export type AcknowledgeMessage = { msgCode: RunnerMessageCode.ACKNOWLEDGE } & AcknowledgeMessageData;

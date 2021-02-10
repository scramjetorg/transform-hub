import { ErrorMessage } from "./error";

import { RunnerMessageCode } from "@scramjet/types";

/**
 * Message indicating whether the command received from Supervisor was received and whether it was performed or not.
 * Optionally, it may include a related error messsage.
 * This message type is sent from Runner.
 */
export interface AcknowledgeMessage {

    /** Message type code from RunnerMessageCode enumeration */
    msgCode: RunnerMessageCode,

    /** Indicates whether a message was received. */
    acknowledged: boolean;
    status: number;
    errorMsg?: ErrorMessage;
}
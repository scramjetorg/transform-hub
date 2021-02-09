import { BaseMessage } from "./base-message";
import { ErrorMessage } from "./error";

/**
 * Message indicating whether the command received from Supervisor was received and whether it was performed or not.
 * Optionally, it may include a related error messsage.
 * This message type is sent from Runner.
 */
export interface AcknowledgeMessage extends BaseMessage {
    acknowledged: boolean;
    status: number;
    errorMsg?: ErrorMessage;
}
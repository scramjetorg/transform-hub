import { RunnerMessageCode } from "../../types/runner";
/**
 * General message class
 * All messages must include a message type code.
 */
export interface BaseMessage {
    messageTypeCode: RunnerMessageCode;
}
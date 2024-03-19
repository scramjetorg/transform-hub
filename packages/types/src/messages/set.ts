import { RunnerMessageCode } from "@scramjet/symbols";
import { LogLevel } from "../object-logger";

export type SetMessageData = {
    logLevel?: LogLevel;
}

/**
 * Cloud Server Host (CSH) sends handshake acknowledge message (PONG) to the Runner in response to
 * the received handshake message (PING).
 * The message includes the Sequence configuration information.
 */
export type SetMessage = { msgCode: RunnerMessageCode.PONG } & SetMessageData;

import { RunnerMessageCode } from "@scramjet/symbols";
import { AppConfig } from "../app-config";
import { LogLevel } from "../object-logger";

export type HandshakeAcknowledgeMessageData = {

    /** Sequence configuration passed to the Sequence when it is started by the Runner. */
    appConfig: AppConfig;
    args?: any[],
    logLevel?: LogLevel;
}

/**
 * Cloud Server Host (CSH) sends handshake acknowledge message (PONG) to the Runner in response to
 * the received handshake message (PING).
 * The message includes the Sequence configuration information.
 */
export type HandshakeAcknowledgeMessage = { msgCode: RunnerMessageCode.PONG } & HandshakeAcknowledgeMessageData;

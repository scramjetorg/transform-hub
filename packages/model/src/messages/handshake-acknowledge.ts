import { AppConfig } from "@scramjet/types";
import { RunnerMessageCode } from "../.";

export type HandshakeAcknowledgeMessageData = {

    /** Sequence configuration passed to the Sequence when it is started by the Runner. */
    appConfig: AppConfig;
    arguments?: any[]
}

/**
 * Cloud Server Host (CSH) sends handshake acknowledge message (PONG) to the Runner in response to
 * the received handshake message (PING).
 * The message includes the Sequence configuration information.
 */
export type HandshakeAcknowledgeMessage = { msgCode: RunnerMessageCode.PONG } & HandshakeAcknowledgeMessageData;

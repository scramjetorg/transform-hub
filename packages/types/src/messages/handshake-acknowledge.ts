import { RunnerMessageCode } from "@scramjet/symbols";
import { AppConfig } from "../app-config";

export type HandshakeAcknowledgeMessageData = {

    /** Sequence configuration passed to the Sequence when it is started by the Runner. */
    appConfig: AppConfig;
    args?: any[]
}

/**
 * Cloud Server Host (CSH) sends handshake acknowledge message (PONG) to the Runner in response to
 * the received handshake message (PING).
 * The message includes the Sequence configuration information.
 */
export type HandshakeAcknowledgeMessage = { msgCode: RunnerMessageCode.PONG } & HandshakeAcknowledgeMessageData;

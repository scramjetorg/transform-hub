import { RunnerMessageCode } from "../.";

/**
 * Runner sends a handshake message to the Cloud Server Host (CSH) after it is.
 * Runner is then waiting to receive the handshake acknowledge message back (PONG) 
 * from the CSH to start the Sequence.
 */
export type HandshakeMessage = { msgCode: RunnerMessageCode.PING };

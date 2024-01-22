import { RunnerMessageCode } from "@scramjet/symbols";
import { SequenceInfo } from "../sequence-adapter";
import { StartSequencePayload } from "../rest-api-sth";
import { InstanceStatus } from "../instance";

/**
 * Runner sends a handshake message to the Cloud Server Host (CSH) after it is.
 * Runner is then waiting to receive the handshake acknowledge message back (PONG)
 * from the CSH to start the Sequence.
 */
export type HandshakeMessage = {
    msgCode: RunnerMessageCode.PING,
    sequence: SequenceInfo,
    payload: StartSequencePayload,
    sequenceInfo: SequenceInfo
};

export type PingMessageData = {
    id: string;
    ports?: Record<string, string>;
    payload: StartSequencePayload;
    sequenceInfo: SequenceInfo;
    created: number;
    status: InstanceStatus;
};

export type PangMessageData = {
    requires?: string,
    contentType?: string,
    provides?: string
};

/**
 * Common message data types used across runner, host, and manager.
 *
 * Simplified structural copies from the old types package/messages/*.ts,
 * avoiding imports of @scramjet/symbols for enum values.
 */

export type EventMessageData = {
    eventName: string;
    source?: string;
    scope?: "space" | "host" | "sequence" | "instance";
    message: any;
};

export type STHTopicEventData =
    | {
          status: "add";
          topicName: string;
          contentType: string;
          localProvider?: string;
          requires?: string;
          provides?: string;
      }
    | {
          status: "remove";
          topicName: string;
      };

export type StopSequenceMessageData = {
    timeout: number;
    canCallKeepalive: boolean;
};

export type KeepAliveMessageData = {
    keepAlive: number;
};

export type PingMessageData = {
    id: string;
    ports?: Record<string, string>;
    payload: any;
    sequenceInfo: any;
    created: number;
    status: string;
    inputHeadersSent: boolean;
};

export type ReadinessDiagnostic = {
    code: string;
    phase: "initialize";
    message: string;
};

export type ReadinessMessageData = {
    state: "ready" | "errored";
    exposePath?: string;
    exposeHost?: string;
    exposePort?: number;
    diagnostic?: ReadinessDiagnostic;
};

export type PangMessageData = {
    requires?: string;
    contentType?: string;
    provides?: string;
    outputEncoding?: string | null;
};

export type OpRecord = {
    opCode: number | string;
    opState: string;
    requestId?: string;
    requestorId: string;
    receivedAt: number;
    tx?: number;
    rx?: number;
    objectId: string;
    limits?: any;
};

import { LogLevel } from "./object-logger";

export type HandshakeAcknowledgeMessageData = {
    appConfig: any;
    args?: any[];
    logLevel?: LogLevel;
};

export type MonitoringRateMessageData = {
    monitoringRate: number;
};

export type SetMessageData = {
    logLevel?: LogLevel;
};

export type StorageMessageData = {
    values: Record<string, any>;
};

export type MonitoringMessageData = {
    sequences?: any[];
    healthy: boolean;
    error?: any;
    cpuTotalUsage?: number;
    memoryUsage?: number;
    memoryMaxUsage?: number;
    limit?: number;
    networkRx?: number;
    networkTx?: number;
    containerId?: string;
    processId?: number;
};

export type StorageUpdateMessageData = {
    key: string;
    value: any;
};

/**
 * Local type definitions for host package.
 *
 * These replace types previously imported from the old types package
 * that are specific to the host package.
 */

import { ContentType as RtContentType } from "@scramjet/runtime-types";

export type ContentType = RtContentType;

export type StreamOrigin = {
    type: "space" | "hub";
    id: string;
};

export type TopicOptions = {
    contentType: ContentType;
};

export type TopicState = string | number;

export interface TopicHandler {
    options(): TopicOptions;
    [key: string]: any;
}

export type OpResponse<PayloadType extends Record<string, unknown> = any> =
    | (PayloadType & { opStatus: string; message?: string })
    | { opStatus: string; error?: any };

export type StartSequenceDTO = any;
export type SpaceEventMessageData = any;

export type MessageDataType<_T> = any;

export type RunnerTransport = any;
export type RunnerTransportConnectOptions = any;
export type RunnerTransportRouteContracts = any;

export type CPMConnectorOptions = any;
export type LoadCheckStatMessage = any;
export type NetworkInfo = any;
export type STHIDMessageData = any;
export type AddSTHTopicEventData = any;

export type EncodedMessage<_T> = [any, any];
export type HandshakeAcknowledgeMessage = any;
export type MonitoringMessageData = any;

export type STHTopicEventData = any;

export const DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS = {
    runnerDomain: "runner.<instanceId>.scramjet.internal",
    stdinPath: "/stdin",
    stdoutPath: "/stdout",
    stderrPath: "/stderr",
    controlPath: "/control",
    monitoringPath: "/monitoring",
    inputPath: "/input",
    outputPath: "/output",
    logPath: "/log",
    requestsPath: "/requests",
};

export interface ICommunicationHandler {
    logger: any;
    waitForHandshake(): Promise<any>;
    hookUpstreamStreams(str: any): this;
    hookDownstreamStreams(str: any): this;
    addMonitoringHandler(code: any, handler: (...args: any[]) => any, blocking?: boolean): this;
    addControlHandler(code: any, handler: (...args: any[]) => any): this;
    pipeMessageStreams(): this;
    pipeStdio(): this;
    pipeDataStreams(): this;
    sendMonitoringMessage(code: any, msg: any): Promise<void>;
    sendControlMessage(code: any, msg: any): Promise<void>;
    getMonitorStream(): any;
    getLogOutput(): any;
    getStdio(): { stdin: any; stdout: any; stderr: any };
}

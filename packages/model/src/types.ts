/**
 * Local type stubs for model package.
 *
 * These replace types previously imported from the old types package.
 * All stubs use simplified structural types to keep model package
 * dependency-light.
 */

import { RunnerMessageCode, CPMMessageCode } from "@scramjet/symbols";

export type MaybePromise<T> = Promise<T> | T;
export type PassThoughStream<_T> = any;
export type WritableStream<_T> = any;
export type ReadableStream<_T> = any;

export type UpstreamStreamsConfig = any[];
export type DownstreamStreamsConfig = any[];
export type EncodedControlMessage = [any, any];
export type EncodedMonitoringMessage = [any, any];

export interface IObjectLogger {
    [key: string]: any;
}

export type InstanceConnectionInfo = Record<string, any>;
export type LoggerOutput = { out: any; err: any };

export type CPMMessage = [any, any];
export type RunnerMessage = [any, any];
export type MessageType<_T> = any;
export type MessageDataType<_T> = any;

export type ControlMessageCode = RunnerMessageCode | CPMMessageCode;
export type MonitoringMessageCode = string | number;
export type ControlMessageHandler<_T> = (msg: any) => any;
export type MonitoringMessageHandler<_T> = (msg: any) => void;
export type MutatingMonitoringMessageHandler<_T> = (msg: any) => any;

// Communication handler interface (simplified)
export interface ICommunicationHandler {
    logger: IObjectLogger;
    waitForHandshake(): Promise<InstanceConnectionInfo>;
    hookUpstreamStreams(str: UpstreamStreamsConfig): this;
    hookDownstreamStreams(str: DownstreamStreamsConfig): this;
    addMonitoringHandler(code: any, handler: (...args: any[]) => any, blocking?: boolean): this;
    addControlHandler(code: any, handler: (...args: any[]) => any): this;
    pipeMessageStreams(): this;
    pipeStdio(): this;
    pipeDataStreams(): this;
    sendMonitoringMessage(code: any, msg: any): Promise<void>;
    sendControlMessage(code: any, msg: any): Promise<void>;
    getMonitorStream(): any;
    getLogOutput(): LoggerOutput;
    getStdio(): { stdin: any; stdout: any; stderr: any };
}

// Individual message data types (simplified structural copies)
export type AcknowledgeMessageData = { acknowledged: boolean };
export type DescribeSequenceMessageData = { definition: any[] };
export type ErrorMessageData = { message: string; stack?: string; exitCode?: number; errorCode?: number };
export type KillMessageData = { removeImmediately?: boolean };
export type MonitoringRateMessageData = { monitoringRate: number };
export type MonitoringMessageFromRunnerData = { sequences?: any[]; healthy: boolean; error?: any };
export type ReadinessMessageData = {
    state: "ready" | "errored";
    exposePath?: string;
    exposeHost?: string;
    exposePort?: number;
    diagnostic?: { code: string; phase: "initialize"; message: string };
};
export type MonitoringMessageData = MonitoringMessageFromRunnerData & Record<string, any>;
export type StopSequenceMessageData = { timeout: number; canCallKeepalive: boolean };
export type KeepAliveMessageData = { keepAlive: number };
export type EventMessageData = { eventName: string; source?: string; scope?: string; message: any };
export type EventMessage = { msgCode: any } & EventMessageData;

// Combined message types (for type guards)
export type AcknowledgeMessage = { msgCode: any } & AcknowledgeMessageData;
export type DescribeSequenceMessage = { msgCode: any } & DescribeSequenceMessageData;
export type ErrorMessage = { msgCode: any } & ErrorMessageData;
export type KeepAliveMessage = { msgCode: any } & KeepAliveMessageData;
export type KillSequenceMessage = { msgCode: any } & KillMessageData;
export type MonitoringRateMessage = { msgCode: any } & MonitoringRateMessageData;
export type MonitoringMessage = { msgCode: any } & MonitoringMessageData;
export type StopSequenceMessage = { msgCode: any } & StopSequenceMessageData;

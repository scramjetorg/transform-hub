/**
 * Stream configuration and encoded message types.
 *
 * Simplified structural copies from the old types package/message-streams.ts.
 * Uses loose type parameters to avoid importing symbol enums.
 */

export type EncodedControlMessage = [any, any];
export type EncodedMonitoringMessage = [any, any];
export type EncodedSerializedControlMessage = string;
export type EncodedSerializedMonitoringMessage = string;

export type UpstreamStreamsConfig = [
    stdin: any,   // ReadableStream<string>
    stdout: any,  // WritableStream<string>
    stderr: any,  // WritableStream<string>
    control: any, // ReadableStream<...>
    monitor: any, // WritableStream<...>
    input: any,   // ReadableStream<any>
    output: any,  // WritableStream<any>
    log: any,     // WritableStream<any>
    requests?: any // DuplexStream<Buffer, Buffer>
];

export type DownstreamStreamsConfig = [
    stdin: any,   // WritableStream<string>
    stdout: any,  // ReadableStream<string>
    stderr: any,  // ReadableStream<string>
    control: any, // WritableStream<...>
    monitor: any, // ReadableStream<...>
    input: any,   // WritableStream<any>
    output: any,  // ReadableStream<any>
    log: any,     // ReadableStream<any>
    requests?: any // DuplexStream<Buffer, Buffer>
];

export type PassThroughStreamsConfig = [
    stdin: any,
    stdout: any,
    stderr: any,
    control: any,
    monitor: any,
    input: any,
    output: any,
    log: any,
    pkg?: any
];

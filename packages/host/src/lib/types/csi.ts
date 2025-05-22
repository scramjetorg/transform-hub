import { InstanceStatus, RunnerMessageCode } from "@scramjet/symbols";
import {
    ReadableStream,
    WritableStream,
    EventMessageData,
    SetMessageData,
    StopSequenceMessageData,
    STHRestAPI,
    InstanceStats,
    MessageDataType,
    DownstreamStreamsConfig,
    APIRoute,
    InstanceId
} from "@scramjet/types";
import { TypedEmitter } from "@scramjet/utility";

export type CSIEvents = {
    ping: (pingMessage: MessageDataType<RunnerMessageCode.PING>) => void;
    pang: (payload: MessageDataType<RunnerMessageCode.PANG>) => void;
    event: (payload: EventMessageData) => void;
    hourChime: () => void;
    error: (error: any) => void;
    stop: (code: number) => void;
    end: (code: number) => void;
    terminated: (code: number) => void;
};

export interface ICSI extends TypedEmitter<CSIEvents> {
    /** whether `/input` is enabled */
    readonly apiInputEnabled: boolean;

    readonly router?: APIRoute;

    /** output sgtream encoding (if set) */
    readonly outputEncoding?: BufferEncoding;

    /** the instance id */
    readonly id: InstanceId;

    /** RPC expose info (used by instance-api router.forward) */
    readonly expose?: {
        path?: string;
        host?: string;
        port?: number;
    };

    /** RPC Url */
    readonly rpcUrl?: string;

    readonly status: InstanceStatus;
    readonly lastStats: InstanceStats;

    readonly isRunning: boolean;
    readonly heartBeatPromise?: Promise<InstanceId>;

    /** GET “/” → instance info */
    getInfo(): STHRestAPI.GetInstanceResponse;

    /** [ stdin, stdout, stderr ] */
    getStdio(): [WritableStream<any>, ReadableStream<any>, ReadableStream<any>];

    /** the “/output” stream */
    getOutputStream(): ReadableStream<any>;

    /** the “/log” stream */
    getLogStream(): ReadableStream<any>;

    sendStorageUpdate(key: string, value: string | null): Promise<void>;

    /** the “/monitoring” stream */
    getMonitoringStream(): ReadableStream<any>;

    /** wait for a named event */
    awaitEvent(name: string): Promise<any>;

    /** POST “/_set” */
    set(payload: SetMessageData): Promise<void>;

    /** POST “/_stop” */
    stop(opts: StopSequenceMessageData): Promise<void>;

    /** POST “/_kill” */
    kill(opts?: { removeImmediately?: boolean }): Promise<void>;

    /** POST “/_event” */
    emitEvent(data: EventMessageData): Promise<void>;

    /** used by `/input` & duplex `/inout` */
    getInput(contentType?: string): Promise<WritableStream<any>>;

    handleInstanceConnect(streams: DownstreamStreamsConfig): Promise<void>;
    handleInstanceReconnect(streams: DownstreamStreamsConfig): Promise<void>;
}

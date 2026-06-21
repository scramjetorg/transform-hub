import type { EventEmitter } from "events";
import type { Writable } from "stream";

import type { ObjLogger } from "@scramjet/obj-logger";
import type {
    APIExpose,
    AppConfig,
    AppError,
    EventMessageData,
    StopSequenceMessageData,
    StorageUpdateMessageData,
    SequenceInfo,
} from "@scramjet/types";

import type { RunnerNodeBootConfig } from "./boot-config";
import type { RunnerNodeFdStreams } from "./fd-streams";
import type { HostClient } from "./host-client";
import type { HubClient, SpaceClient } from "@scramjet/rest-api2";
import type { LifecycleContext } from "./lifecycle";
import type { LocalStorageAgent } from "./local-storage-agent";
import type { RunnerAppContext } from "./runner-app-context";

export interface SequenceLocalContext {
    bootConfig: RunnerNodeBootConfig;
    streams: RunnerNodeFdStreams;
    instanceId: string | undefined;
    logger: ObjLogger;
    emitter: EventEmitter;
    localStorage: LocalStorageAgent;
    monitorStream: Writable;
    keepAlive(milliseconds?: number): SequenceLocalContext;
    end(): SequenceLocalContext;
    destroy(error?: AppError | Error): SequenceLocalContext;
    on(eventName: string, handler: (msg?: unknown) => void): SequenceLocalContext;
    emit(eventName: string, message?: unknown): SequenceLocalContext;
    addStopHandler(handler: (timeout: number, canCallKeepalive: boolean) => Promise<void> | void): SequenceLocalContext;
    addKillHandler(handler: () => void): SequenceLocalContext;
}

export type SequenceFunction = (this: unknown, instanceOutput: unknown, ...args: unknown[]) => unknown;

export type SequenceModule =
    | SequenceFunction
    | SequenceFunction[]
    | { default?: SequenceFunction | SequenceFunction[] };

export interface ControlDispatch {
    onStop(data: StopSequenceMessageData): Promise<void>;
    onKill(): Promise<void>;
    onEvent(data: EventMessageData): void;
    onStorageUpdate(data: StorageUpdateMessageData): void;
}

export interface BuildContextDeps {
    bootConfig: RunnerNodeBootConfig;
    streams: RunnerNodeFdStreams;
    emitter: EventEmitter;
    logger: ObjLogger;
    onKeepAliveIssued: () => void;
}

export interface BuildSequenceContextResult {
    context: SequenceLocalContext & LifecycleContext;
    localStorage: LocalStorageAgent;
}

export interface BuildAppContextDeps {
    bootConfig: RunnerNodeBootConfig;
    monitorStream: Writable;
    emitter: EventEmitter;
    logger: ObjLogger;
    hostClient: HostClient;
    onKeepAliveIssued: () => void;
}

export interface BuildAppContextResult {
    context: RunnerAppContext<AppConfig, unknown, HubClient, SpaceClient> & LifecycleContext;
    api: APIExpose;
    localStorage: LocalStorageAgent;
}

export interface BootstrapOverrides {
    loadSequence?: (sequencePath: string) => SequenceFunction[];
}

export interface RunnerHandshakeInputs {
    instanceId: string;
    sequenceInfo: SequenceInfo;
    appConfig: AppConfig;
    args: unknown[];
    instanceName?: string;
    exposePath?: string;
    exposeHost?: string;
    exposePort?: number;
}

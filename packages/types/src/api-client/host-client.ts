import { Readable } from "stream";
import { LoadCheckStat } from "../load-check-stat";
import { KillMessageData } from "../messages";
import * as STHRestAPI from "../rest-api-sth";
import { PublicSTHConfiguration } from "../sth-configuration";
import { ClientUtils, HttpClient, SendStreamOptions } from "./client-utils";
import * as nodeFetch from "node-fetch";
export type InstanceInputStream = "stdin" | "input";
export type InstanceOutputStream = "stdout" | "stderr" | "output" | "log";

export declare class ClientProvider {
    client: HttpClient;
}

export declare class InstanceClient {
    get id(): string;

    static from(id: string, host: ClientProvider): InstanceClient;
    stop(timeout: number, canCallKeepalive: boolean): Promise<STHRestAPI.SendStopInstanceResponse>;
    kill(opts?: KillMessageData): Promise<STHRestAPI.SendKillInstanceResponse>;
    sendEvent(eventName: string, message: string): Promise<STHRestAPI.ControlMessageResponse>;
    getNextEvent(eventName: string): Promise<any>;
    getEvent(eventName: string): Promise<any>;
    getEventStream(eventName: string): Promise<import("stream").Readable>;
    getHealth(): Promise<STHRestAPI.GetHealthResponse>;
    getInfo(): Promise<STHRestAPI.GetInstanceResponse>;
    getStream(streamId: InstanceOutputStream): ReturnType<HttpClient["getStream"]>;
    sendStream(streamId: InstanceInputStream, stream: Parameters<HttpClient["sendStream"]>[1] | string, requestInit?: nodeFetch.RequestInit, options?: SendStreamOptions): Promise<any>;
    sendInput(stream: Parameters<HttpClient["sendStream"]>[1] | string, requestInit?: nodeFetch.RequestInit, options?: SendStreamOptions): Promise<any>;
    sendStdin(stream: Parameters<HttpClient["sendStream"]>[1] | string): Promise<any>;
}

export declare class SequenceClient {
    get id(): string;

    static from(id: string, host: ClientProvider): SequenceClient;

    constructor(apiBase: string, utils: ClientUtils | undefined);

    start(payload: STHRestAPI.StartSequencePayload): Promise<InstanceClient>;
    listInstances(): Promise<string[]>;
    getInstance(id: string, host: ClientProvider): Promise<InstanceClient>;
    getInfo(): Promise<STHRestAPI.GetSequenceResponse>;
    overwrite(stream: Readable): Promise<SequenceClient>;
}

export declare class HostClient {
    apiBase: string;
    client: ClientUtils;

    constructor(apiBase: string, utils: ClientUtils | undefined)

    listSequences(): Promise<STHRestAPI.GetSequencesResponse>;
    listInstances(): Promise<STHRestAPI.GetInstancesResponse>;
    listEntities(): Promise<STHRestAPI.GetEntitiesResponse>;
    getLogStream(requestInit?: nodeFetch.RequestInit): ReturnType<HttpClient["getStream"]>;
    sendSequence(sequencePackage: Parameters<HttpClient["sendStream"]>[1], requestInit?: nodeFetch.RequestInit, update?: boolean): Promise<SequenceClient>;
    getSequence(sequenceId: string): Promise<STHRestAPI.GetSequenceResponse>;
    deleteSequence(sequenceId: string): Promise<STHRestAPI.DeleteSequenceResponse>;
    getInstanceInfo(instanceId: string): Promise<STHRestAPI.GetInstanceResponse>;
    getLoadCheck(): Promise<LoadCheckStat>;
    getVersion(): Promise<STHRestAPI.GetVersionResponse>;
    getStatus(): Promise<STHRestAPI.GetStatusResponse>;
    getConfig(): Promise<PublicSTHConfiguration>;
    sendNamedData<T>(topic: string, stream: Parameters<HttpClient["sendStream"]>[1], requestInit?: nodeFetch.RequestInit, contentType?: string, end?: boolean): Promise<T>;
    getNamedData(topic: string, requestInit?: nodeFetch.RequestInit): ReturnType<HttpClient["getStream"]>;
    getTopics(): Promise<STHRestAPI.GetTopicsResponse>;
    getInstanceClient(id: string): InstanceClient;
    getSequenceClient(id: string): SequenceClient;
    getEntities(): Promise<STHRestAPI.GetEntitiesResponse>;
}

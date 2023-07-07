/// <reference lib="dom" />

import { MRestAPI } from "..";

import * as STHRestAPI from "../rest-api-sth";
import { PublicSTHConfiguration } from "../sth-configuration";
import { ClientUtils, HttpClient } from "../client-utils";

export declare class ManagerClient {
    apiBase: string;
    client: ClientUtils;

    constructor(apiBase: string, utils: ClientUtils | undefined);

    getHostClient(id: string, hostApiBase: string): import("../api-client/host-client").HostClient;
    getHosts(): Promise<MRestAPI.GetHostInfoResponse[]>;
    getVersion(): Promise<STHRestAPI.GetVersionResponse>;
    sendNamedData<T>(topic: string, stream: Parameters<HttpClient["sendStream"]>[1], requestInit?: RequestInit, contentType?: string, end?: boolean): Promise<T>;
    getNamedData(topic: string, requestInit?: RequestInit): ReturnType<HttpClient["getStream"]>;
    getLogStream(requestInit?: RequestInit): ReturnType<HttpClient["getStream"]>;
    getAuditStream(requestInit?: RequestInit): ReturnType<HttpClient["getStream"]>;
    getConfig(): Promise<PublicSTHConfiguration>;
    getSequences(sequenceId: string): Promise<MRestAPI.GetSequencesResponse>;
    getInstances(): Promise<MRestAPI.GetInstancesResponse>;
    getTopics(): Promise<MRestAPI.GetTopicsResponse>;
}

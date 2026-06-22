/// <reference lib="dom" />

import * as STHRestAPI from "../rest-api-sth";
import * as MRestAPI from "../rest-api-manager";
import { HostClient } from "./host-client";
import { ClientUtils, HttpClient } from "../client-utils";
import { Readable } from "stream";

export declare class ManagerClient {
    apiBase: string;
    client: ClientUtils;

    constructor(apiBase: string, utils: ClientUtils | undefined);

    getHostClient(id: string, hostApiBase?: string): HostClient;
    getHosts(): Promise<MRestAPI.GetHostInfoResponse[]>;
    getVersion(): Promise<STHRestAPI.GetVersionResponse>;
    sendNamedData<T>(topic: string, stream: Parameters<HttpClient["sendStream"]>[1], requestInit?: RequestInit, contentType?: string, end?: boolean): Promise<T>;
    getNamedData(topic: string, requestInit?: RequestInit): ReturnType<HttpClient["getStream"]>;
    getLogStream(requestInit?: RequestInit): ReturnType<HttpClient["getStream"]>;
    getAuditStream(requestInit?: RequestInit): ReturnType<HttpClient["getStream"]>;
    getConfig(): Promise<MRestAPI.GetConfigResponse>;
    getAllSequences(): Promise<MRestAPI.GetSequencesResponse>;
    getSequences(sequenceId?: string): Promise<MRestAPI.GetSequenceIDSResponse>;
    getInstances(): Promise<MRestAPI.GetInstancesResponse>;
    getTopics(): Promise<MRestAPI.GetTopicsResponse>;
    getStoreItems(): Promise<MRestAPI.GetStoreItemsResponse>
    deleteStoreItem(id: string): Promise<void>
    clearStore(): Promise<void>
    disconnectHubs(opts: MRestAPI.PostDisconnectPayload): Promise<MRestAPI.PostDisconnectResponse>
    deleteHub(id: string, force?: boolean): Promise<MRestAPI.HubDeleteResponse>
    putStoreItem(sequencePackage: Readable, id?: string): Promise<MRestAPI.PutStoreItemResponse>
}

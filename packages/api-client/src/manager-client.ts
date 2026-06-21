/// <reference path="./definitions.d.ts" />

import { ClientUtils, ClientProvider, HttpClient, ClientUtilsCustomAgent } from "@scramjet/client-utils";
import { ApiClientFactory, MRestAPI, LoadCheckStat } from "@scramjet/types";
import { Readable } from "stream";
import type { HostClient } from "./host-client";

function createV2Client(apiBase: string, utils: ClientUtils): ClientUtils {
    const v2ApiBase = apiBase.replace(/\/api\/v1\/?$/, "/api/v2");

    return utils instanceof ClientUtilsCustomAgent
        ? new ClientUtilsCustomAgent(v2ApiBase, utils.agent)
        : new ClientUtils(v2ApiBase);
}

export class ManagerClient<THostClient = HostClient> implements ClientProvider {
    apiBase: string;

    #_client: ClientUtils;
    #_v2Client: ClientUtils;

    get client(): ClientUtils {
        return this.#_client;
    }

    #hostClientFactory?: ApiClientFactory<THostClient, ClientUtils>;

    constructor(apiBase: string, utils = new ClientUtils(apiBase), hostClientFactory?: ApiClientFactory<THostClient, ClientUtils>, v2Utils?: ClientUtils) {
        this.apiBase = apiBase.replace(/\/$/, "");

        this.#_client = utils;
        this.#_v2Client = v2Utils || createV2Client(this.apiBase, this.client);
        this.#hostClientFactory = hostClientFactory;
    }

    getHostClient(id: string, hostApiBase = "/api/v1"): THostClient {
        const apiBase = `${this.apiBase}/sth/${id}${hostApiBase}`;
        const utils = new ClientUtilsCustomAgent(apiBase, this.client.agent);

        if (!this.#hostClientFactory) throw new Error("Host client factory is not configured");

        return this.#hostClientFactory(apiBase, utils);
    }

    async getHosts() {
        return this.client.get<MRestAPI.GetHostInfoResponse[]>("list");
    }

    /**
     * Returns list of all entities on Host.
     * @param {string} sequenceUrl base url exposed from sequence.
     * @param {string} hostTag host tag.
     * @returns {Promise<STHRestAPI.GetEntitiesResponse>} Promise resolving to list of entities.
     */
    async listHostsWithFilter(sequenceUrl : string, hostTag: string) {
        return this.client.get<MRestAPI.GetHostInfoResponse[]>(`${sequenceUrl}/${hostTag}/hosts`);
    }

    async getVersion(): Promise<MRestAPI.GetVersionResponse> {
        return this.client.get<MRestAPI.GetVersionResponse>("version");
    }

    async getLoad(): Promise<LoadCheckStat> {
        return this.client.get<LoadCheckStat>("load");
    }

    async sendNamedData<T>(
        topic: string,
        stream: Parameters<HttpClient["sendStream"]>[1],
        requestInit?: RequestInit,
        contentType?: string,
        end?: boolean
    ) {
        return this.client.sendStream<T>(`topic/${topic}`, stream, requestInit, { type: contentType, end: end });
    }

    async getNamedData(topic: string, requestInit?: RequestInit) {
        return this.client.getStream(`topic/${topic}`, requestInit);
    }

    async getLogStream(requestInit?: RequestInit) {
        return this.client.getStream("log", requestInit);
    }

    async getAuditStream(requestInit?: RequestInit) {
        return this.client.getStream("audit", requestInit);
    }

    async getConfig(): Promise<MRestAPI.GetConfigResponse> {
        const response = await this.#_v2Client.get<{ config?: any } | any>("config");

        return response && typeof response === "object" && "config" in response
            ? response as MRestAPI.GetConfigResponse
            : { config: response } as MRestAPI.GetConfigResponse;
    }

    async getAllSequences(): Promise<MRestAPI.GetSequencesResponse> {
        const response = await this.#_v2Client.get<{ items?: MRestAPI.GetSequencesResponse } | MRestAPI.GetSequencesResponse>("all_sequences");

        return response && typeof response === "object" && "items" in response
            ? response.items ?? []
            : response as MRestAPI.GetSequencesResponse;
    }

    async getSequences(): Promise<MRestAPI.GetSequenceIDSResponse> {
        const response = await this.#_v2Client.get<{ items?: Array<{ id: string } | string> } | MRestAPI.GetSequencesResponse>("sequences");

        return response && typeof response === "object" && "items" in response
            ? response.items?.map(item => typeof item === "string" ? item : item.id) || []
            : (response as MRestAPI.GetSequenceIDSResponse | MRestAPI.GetSequencesResponse)
                .map(item => typeof item === "string" ? item : item.id);
    }

    async getInstances(): Promise<MRestAPI.GetInstancesResponse> {
        const response = await this.#_v2Client.get<{ items?: MRestAPI.GetInstancesResponse } | MRestAPI.GetInstancesResponse>("instances");

        return response && typeof response === "object" && "items" in response
            ? response.items ?? []
            : response as MRestAPI.GetInstancesResponse;
    }

    async getTopics() {
        return this.client.get<MRestAPI.GetTopicsResponse>("topics");
    }

    async getStoreItems(): Promise<MRestAPI.GetStoreItemsResponse> {
        return this.client.get<MRestAPI.GetStoreItemsResponse>("s3");
    }

    async putStoreItem(
        sequencePackage: Readable,
        id: string = ""
    ): Promise<MRestAPI.PutStoreItemResponse> {
        return this.client.sendStream<MRestAPI.PutStoreItemResponse>(`s3/${id}`, sequencePackage, { method: "put" }, {
            parseResponse: "json"
        });
    }

    async deleteStoreItem(id: string): Promise<void> {
        await this.client.delete<any>(`s3/${id}`);
    }

    async clearStore(): Promise<void> {
        await this.client.delete<any>("store");
    }

    async disconnectHubs(opts: MRestAPI.PostDisconnectPayload): Promise<MRestAPI.PostDisconnectResponse> {
        return this.client.post<MRestAPI.PostDisconnectResponse>("disconnect", opts, {}, { json: true, parse: "json" });
    }

    async deleteHub(id: string, force: boolean): Promise<MRestAPI.HubDeleteResponse> {
        return this.client.delete<MRestAPI.HubDeleteResponse>(`sth/${id}`, {
            headers: { "x-force": force.toString(), "content-type": "application/json" }
        });
    }
}

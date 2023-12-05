import { HostClient, } from "@scramjet/api-client";
import { ClientUtils, ClientProvider, HttpClient } from "@scramjet/client-utils";
import { MRestAPI, LoadCheckStat, IManagerClient } from "@scramjet/types";
import { Readable } from "stream";

export class ManagerClient implements ClientProvider, IManagerClient {
    apiBase: string;

    #_client: ClientUtils;

    get client(): ClientUtils {
        return this.#_client;
    }

    constructor(apiBase: string, utils = new ClientUtils(apiBase)) {
        this.apiBase = apiBase.replace(/\/$/, "");

        this.#_client = utils;
    }

    getHostClient(id: string, hostApiBase = "/api/v1") {
        return new HostClient(this.apiBase + "/sth/" + id + hostApiBase);
    }

    async getHosts() {
        return this.client.get<MRestAPI.GetListResponse>("list");
    }

    async getVersion(): Promise<MRestAPI.GetVersionResponse> {
        return this.client.get<MRestAPI.GetVersionResponse>("version");
    }

    async getLoad() {
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

    async getConfig() {
        return this.client.get<any>("config");
    }

    async getAllSequences() {
        return this.client.get<MRestAPI.GetSequencesResponse>("all_sequences");
    }

    async getSequences() {
        return this.client.get<MRestAPI.GetSequencesResponse>("sequences");
    }

    async getInstances() {
        return this.client.get<MRestAPI.GetInstancesResponse>("instances");
    }

    async getTopics() {
        return this.client.get<MRestAPI.GetTopicsResponse>("topics");
    }

    async getStoreItems() {
        return this.client.get<MRestAPI.GetStoreItemsResponse>("s3");
    }

    async putStoreItem(
        sequencePackage: Readable,
        id: string = ""
    ) {
        return this.client.sendStream<MRestAPI.PutStoreItemResponse>(`s3/${id}`, sequencePackage, { method: "put" }, {
            parseResponse: "json"
        });
    }

    async deleteStoreItem(id: string) {
        await this.client.delete<any>(`s3/${id}`);
    }

    async disconnectHubs(opts: MRestAPI.PostDisconnectPayload) {
        return this.client.post<MRestAPI.PostDisconnectResponse>("disconnect", opts, {}, { json: true, parse: "json" });
    }

    async deleteHub(id: string, force: boolean) {
        return this.client.delete<MRestAPI.HubDeleteResponse>(`sth/${id}`, {
            headers: { "x-force": force.toString(), "content-type": "application/json" }
        });
    }
}

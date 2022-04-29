import { HostClient, } from "@scramjet/api-client";
import { ClientUtils, ClientProvider, HttpClient } from "@scramjet/client-utils";
import { MRestAPI, LoadCheckStat } from "@scramjet/types";

export class ManagerClient implements ClientProvider {
    client: HttpClient;
    apiBase: string;

    constructor(apiBase: string, utils = new ClientUtils(apiBase)) {
        this.apiBase = apiBase.replace(/\/$/, "");

        this.client = utils;
    }

    getHostClient(id: string, hostApiBase = "/api/v1") {
        return new HostClient(this.apiBase + "/sth/" + id + hostApiBase);
    }

    async getHosts() {
        return this.client.get<MRestAPI.GetHostInfoResponse[]>("list");
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
        contentType?: string,
        end?: boolean
    ) {
        return this.client.sendStream<T>(`topic/${topic}`, stream, { type: contentType, end: end });
    }

    async getNamedData(topic: string) {
        return this.client.getStream(`topic/${topic}`);
    }

    async getLogStream() {
        return this.client.getStream("log");
    }

    async getConfig() {
        return this.client.get<any>("config");
    }

    async getSequences() {
        return this.client.get<MRestAPI.GetSequencesResponse>("sequences");
    }

    async getInstances() {
        return this.client.get<MRestAPI.GetInstancesResponse>("instances");
    }
}

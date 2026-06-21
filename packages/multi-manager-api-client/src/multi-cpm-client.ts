import { ClientProvider, ClientUtils, HttpClient } from "@scramjet/client-utils";
import { createHostClient, ManagerClient } from "@scramjet/api-client";
import { DeepPartial, LoadCheckStat, ManagerConfiguration, MMRestAPI } from "@scramjet/types";

export class MultiManagerClient implements ClientProvider {
    client: HttpClient;
    apiBase: string;

    constructor(apiBase: string, utils = new ClientUtils(apiBase)) {
        this.apiBase = apiBase.replace(/\/$/, "");

        this.client = utils;
    }

    getManagerClient(id: string, managerApiBase = "/api/v1") {
        return new ManagerClient(this.apiBase + "/cpm/" + id + managerApiBase, undefined, createHostClient);
    }

    async startManager(config: DeepPartial<ManagerConfiguration>, managersApiBase = "/api/v1"): Promise<ManagerClient> {
        const startResponse = await this.client.post<MMRestAPI.SendStartManagerResponse>(
            "start",
            {
                manager: config,
            },
            {
                headers: { "content-type": "application/json" },
            },
            { json: true, parse: "json" }
        );

        return new ManagerClient(this.apiBase + "/cpm/" + startResponse.id + managersApiBase, undefined, createHostClient);
    }

    async getManagers() {
        return this.client.get<MMRestAPI.GetManagersResponse>("list");
    }

    async getVersion() {
        return this.client.get<MMRestAPI.GetVersionResponse>("version");
    }

    async getLoad() {
        return this.client.get<LoadCheckStat>("load");
    }

    async getLogStream() {
        return this.client.getStream("log");
    }

    async getInfo() {
        return this.client.get<MMRestAPI.GetInfoReposnse>("info");
    }
}

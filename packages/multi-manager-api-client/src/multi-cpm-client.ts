/* eslint-disable no-console */
import { ClientProvider, ClientUtils, HttpClient } from "@scramjet/client-utils";
import { ManagerClient } from "@scramjet/manager-api-client";
import { DeepPartial, LoadCheckStat, ManagerConfiguration, MMRestAPI } from "@scramjet/types";
import { ChildProcess } from "child_process";

export class MultiManagerClient implements ClientProvider {
    client: HttpClient;
    apiBase: string;

    constructor(apiBase: string, public process?: ChildProcess, utils = new ClientUtils(apiBase)) {
        this.apiBase = apiBase.replace(/\/$/, "");

        this.client = utils;
    }

    getManagerClient(id: string, managerApiBase = "/api/v1") {
        return new ManagerClient(this.apiBase + "/cpm/" + id + managerApiBase);
    }

    async startManager(config: DeepPartial<ManagerConfiguration>, managersApiBase = "/api/v1"): Promise<ManagerClient> {
        const startResponse = await this.client.post<MMRestAPI.SendStartManagerResponse>(
            "start",
            {
                manager: config,
            },
            {
                "content-type": "application/json",
            },
            { json: true, parse: "json" }
        );

        return new ManagerClient(this.apiBase + "/cpm/" + startResponse.id + managersApiBase);
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

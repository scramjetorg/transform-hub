/* eslint-disable no-console */
import { ClientProvider, ClientUtils, HttpClient } from "@scramjet/client-utils";
import { MultiManagerClient } from "@scramjet/multi-manager-api-client";
import { ManagerClient } from "@scramjet/manager-api-client";
import { MWRestAPI } from "@scramjet/types";

export class MiddlewareClient implements ClientProvider {
    client: HttpClient;
    apiBase: string;

    constructor(apiBase: string, utils = new ClientUtils(apiBase)) {
        this.apiBase = apiBase.replace(/\/$/, "");

        this.client = utils;
    }

    async addMultiManager(api: string) {
        return this.client
            .post<MWRestAPI.MultiManagerResponse>(
                "add",
                { api },
                {
                    "content-type": "application/json",
                },
                { json: true, parse: "json" }
            );
    }

    getMultiManagerClient(id: string, mutliManagerApiBase = "/api/v1") {
        return new MultiManagerClient(`${this.apiBase}/mm/${id}${mutliManagerApiBase}`);
    }

    getManagerClient(id: string, mutliManagerApiBase = "/api/v1") {
        return new ManagerClient(`${this.apiBase}/space/${id}${mutliManagerApiBase}`);
    }

    async listMultiManagers() {
        return this.client.get<MWRestAPI.MultiManagersResponse>("list");
    }

    async getVersion(): Promise<MWRestAPI.VersionResponse> {
        return this.client.get("version");
    }
}

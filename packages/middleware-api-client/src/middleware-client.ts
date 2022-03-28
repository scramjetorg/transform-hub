/* eslint-disable no-console */
import { ClientProvider, ClientUtils } from "@scramjet/client-utils";
import { ManagerClient } from "@scramjet/manager-api-client";
import { MWRestAPI, MMRestAPI } from "@scramjet/types";

export class MiddlewareClient implements ClientProvider {
    apiBase: string;
    client: ClientUtils;

    constructor(apiBase: string, utils = new ClientUtils(apiBase)) {
        this.apiBase = apiBase.replace(/\/$/, "");

        this.client = utils;
    }

    getManagerClient(id: string, mutliManagerApiBase = "/api/v1") {
        return new ManagerClient(`${this.apiBase}/space/${id}${mutliManagerApiBase}`);
    }

    async getManagers() {
        return this.client.get<MMRestAPI.GetManagersResponse>("spaces");
    }

    async getVersion(): Promise<MWRestAPI.VersionResponse> {
        return this.client.get("version");
    }
}

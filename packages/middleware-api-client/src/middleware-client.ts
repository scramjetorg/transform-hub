/* eslint-disable no-console */
import { ClientProvider, ClientUtils, ClientUtilsCustomAgent } from "@scramjet/client-utils";
import { ManagerClient } from "@scramjet/api-client";
import { MWRestAPI, MMRestAPI } from "@scramjet/types";

/**
 * Middleware client.
 * Client for the Middleware interaction.
 */
export class MiddlewareClient implements ClientProvider {
    apiBase: string;
    client: ClientUtils;

    constructor(apiBase: string, utils = new ClientUtils(apiBase)) {
        this.apiBase = apiBase.replace(/\/$/, "");

        this.client = utils;
    }

    /**
     * Creates new ManagerClient with proper base api url setup
     *
     * @param {string} id Space ID used in apiBase url
     * @param {string} mutliManagerApiBase api/version prefix by default
     * @returns {ManagerClient} ManagerClient for space management
     */
    getManagerClient(id: string, mutliManagerApiBase = "/api/v1"): ManagerClient {
        return new ManagerClient(
            `${this.apiBase}/space/${id}${mutliManagerApiBase}`,
            new ClientUtilsCustomAgent(`${this.apiBase}/space/${id}${mutliManagerApiBase}`, this.client.agent)
        );
    }

    /**
     * Requests API for the list of managers avaiable to the user
     *
     * @returns {Promise<MMRestAPI.GetManagersResponse>} List of manager ids
     */
    async getManagers(): Promise<MMRestAPI.GetManagersResponse> {
        return this.client.get<MMRestAPI.GetManagersResponse>("spaces");
    }

    /**
     * Requests API for version of various API components
     *
     * @returns {Promise<MMRestAPI.GetManagersResponse>} List of manager ids
     */
    async getVersion(): Promise<MWRestAPI.GetVersionResponse> {
        return this.client.get("version");
    }

    /**
     * Requests API for version of various API components
     *
     * @returns {Promise<MMRestAPI.GetManagersResponse>} List of manager ids
     */
    async getAuditStream(): Promise<ReadableStream<any>> {
        return this.client.getStream("audit");
    }

    async listAccessKeys(spaceId: string): Promise<MMRestAPI.GetAccessKeysResponse> {
        return this.client.get(`space/${spaceId}/apikey`, {
            headers: { "content-type": "application/json" },
        });
    }

    async createAccessKey(spaceId: string, opts: { description?: string }): Promise<any> {
        return this.client.post(`space/${spaceId}/apikey`, {
            description: opts.description?.trim()
        }, {
            headers: { "content-type": "application/json" },
        },
        { json: true, parse: "json" });
    }

    async revokeAccessKey(spaceId: string, accessKey: string): Promise<any> {
        return this.client.delete(`space/${spaceId}/apikey`, {
            headers: {
                "content-type": "application/json",
                "x-revoke": accessKey
            }
        });
    }

    async revokeAllAccessKeys(spaceId: string) : Promise<{message:string, keysRevoked: number}> {
        return this.client.delete(`space/${spaceId}/apikey`, {
            headers: {
                "content-type": "application/json",
                "x-revoke-all": "true"
            }
        });
    }
}

/// <reference path="./definitions.d.ts" />

import { ClientProvider, ClientUtils, ClientUtilsCustomAgent, Headers, HttpClient } from "@scramjet/client-utils";
import { ApiClientFactory, PublicSTHConfiguration, STHRestAPI } from "@scramjet/api-types";
import { InstanceClient } from "./instance-client";
import { SequenceClient } from "./sequence-client";
import { HostHeaders } from "@scramjet/symbols";
import { ManagerClient } from "./manager-client";

export const createHostClient: ApiClientFactory<HostClient, ClientUtils> = (apiBase, utils) => new HostClient(apiBase, utils);

function createV2Client(apiBase: string, utils: ClientUtils): ClientUtils {
    const v2ApiBase = apiBase.replace(/\/api\/v1\/?$/, "/api/v2");

    return utils instanceof ClientUtilsCustomAgent ? new ClientUtilsCustomAgent(v2ApiBase, utils.agent) : new ClientUtils(v2ApiBase);
}

/**
 * Host client.
 * Provides methods to interact with Host.
 */
export class HostClient implements ClientProvider {
    apiBase: string;

    #_client: ClientUtils;
    #_v2Client: ClientUtils;
    #disposed = false;

    get client(): ClientUtils {
        return this.#_client;
    }

    constructor(apiBase: string, utils = new ClientUtils(apiBase), v2Utils?: ClientUtils) {
        this.apiBase = apiBase.replace(/\/$/, "");

        this.#_client = utils;
        this.#_v2Client = v2Utils || createV2Client(this.apiBase, this.client);
    }

    /** Dispose both API transports; borrowed agents remain owned by their parent client. */
    dispose(): void {
        if (this.#disposed) return;
        this.#disposed = true;
        this.#_v2Client.dispose();
        this.#_client.dispose();
    }

    /**
     * Returns list of all Sequences on Host.
     *
     * @returns {Promise<STHRestAPI.GetSequencesResponse[]>} Promise resolving to list of Sequences.
     */
    async listSequences() {
        return this.client.get<STHRestAPI.GetSequencesResponse>("sequences");
    }

    /**
     * Returns list of all Sequences on given Host, optionally filtered by the tag.
     * @param {string} sequenceUrl base url exposed from sequence.
     * @param {string} hostTag host tag.
     * @param {string} filter filtering tag.
     * @returns {Promise<STHRestAPI.GetSequencesResponse>} Promise resolving to list of Sequences.
     */
    async listSequencesWithFilter(sequenceUrl: string, hostTag: string, filter?: string) {
        if (filter) return this.client.get<STHRestAPI.GetSequencesResponse>(`${sequenceUrl}/${hostTag}/sequences/${filter}`);
        return this.client.get<STHRestAPI.GetSequencesResponse>(`${sequenceUrl}/${hostTag}/sequences`);
    }

    async getSequenceId(sequenceName: string): Promise<string[]> {
        const sequenceList = await this.client.get<STHRestAPI.GetSequencesResponse>("sequences");
        const result = sequenceList.filter((sequence: any) => sequence.config.name === sequenceName);

        if (!result.length) {
            throw new Error("No results found");
        }

        return result.map((element: any) => element.id);
    }

    /**
     * Returns list of all Instances on Host.
     *
     * @returns {Promise<STHRestAPI.GetInstancesResponse>} Promise resolving to list of Instances.
     */
    async listInstances() {
        return this.client.get<STHRestAPI.GetInstancesResponse>("instances");
    }

    /**
     * Returns list of all Instances on given Host.
     * @param {string} sequenceUrl base url exposed from sequence.
     * @param {string} hostTag host tag.
     * @returns {Promise<STHRestAPI.GetSequencesResponse>} Promise resolving to list of Instances.
     */
    async listInstancesWithFilter(sequenceUrl: string, hostTag: string) {
        return this.client.get<STHRestAPI.GetSequencesResponse>(`${sequenceUrl}/${hostTag}/instances`);
    }

    /**
     * Returns list of all entities on Host.
     *
     * @returns {Promise<STHRestAPI.GetEntitiesResponse>} Promise resolving to list of entities.
     */
    async listEntities() {
        return this.client.get<STHRestAPI.GetEntitiesResponse>("entities");
    }

    /**
     * Returns Host audit stream.
     *
     * @param {RequestInit} requestInit RequestInit object to be passed to fetch.
     * @returns Promise resolving to response with log stream.
     */
    async getAuditStream(requestInit?: RequestInit): ReturnType<HttpClient["getStream"]> {
        return this.client.getStream("audit", requestInit);
    }

    /**
     * Returns Host log stream.
     *
     * @param {RequestInit} requestInit RequestInit object to be passed to fetch.
     * @returns Promise resolving to response with log stream.
     */
    async getLogStream(requestInit?: RequestInit): ReturnType<HttpClient["getStream"]> {
        return this.client.getStream("log", requestInit);
    }

    /**
     * Uploads Sequence to Host.
     *
     * @param sequencePackage Stream with packed Sequence.
     * @param {RequestInit} requestInit RequestInit object to be passed to fetch.
     * @param {boolean} update Send request with post or put method.
     * @returns {SequenceClient} Sequence client.
     */
    async sendSequence(sequencePackage: Parameters<HttpClient["sendStream"]>[1], requestInit?: RequestInit): Promise<SequenceClient> {
        const response = await this.client.sendStream<any>("sequence", sequencePackage, requestInit, {
            parseResponse: "json"
        });

        return SequenceClient.from(response.id, this);
    }

    /**
     * Returns Sequence details.
     *
     * @param {string} sequenceId Sequence id.
     * @returns {Promise<STHRestAPI.GetSequenceResponse>} Promise resolving to Sequence details.
     */
    async getSequence(sequenceId: string) {
        return this.client.get<STHRestAPI.GetSequenceResponse>(`sequence/${sequenceId}`);
    }

    /**
     * Deletes Sequence with given id.
     *
     * @param {string} sequenceId Sequence id.
     * @param {any} opts Additional sequence delete options.
     * @returns {STHRestAPI.Promise<DeleteSequenceResponse>} Promise resolving to delete Sequence result.
     */
    async deleteSequence(sequenceId: string, opts?: { force: boolean }): Promise<STHRestAPI.DeleteSequenceResponse> {
        const headers: HeadersInit = {};

        if (opts?.force) headers[HostHeaders.SEQUENCE_FORCE_REMOVE] = "true";

        return this.client.delete<STHRestAPI.DeleteSequenceResponse>(`sequence/${sequenceId}`, { headers });
    }

    // REVIEW: move this to InstanceClient..getInfo()?
    /**
     * Returns Instance details.
     *
     * @param {string} instanceId Instance id.
     * @returns {Promise<STHRestAPI.GetInstanceResponse>} Promise resolving to Instance details.
     */
    async getInstanceInfo(instanceId: string) {
        return this.client.get<STHRestAPI.GetInstanceResponse>(`instance/${instanceId}`);
    }

    /**
     * Returns Host load-check.
     *
     * @returns {Promise<STHRestAPI.GetLoadCheckResponse>} Promise resolving to Host load check data.
     */
    async getLoadCheck(requestInit?: RequestInit) {
        return this.client.get<STHRestAPI.GetLoadCheckResponse>("load-check", requestInit);
    }

    /**
     * Returns Host version.
     *
     * @returns {Promise<STHRestAPI.GetVersionResponse>} Promise resolving to Host version.
     */
    async getVersion() {
        return this.client.get<STHRestAPI.GetVersionResponse>("version");
    }

    /**
     * Returns Host status.
     */
    async getStatus(): Promise<STHRestAPI.GetStatusResponse> {
        const response = await this.#_v2Client.get<{ details?: STHRestAPI.GetStatusResponse } | STHRestAPI.GetStatusResponse>("status");

        return response && typeof response === "object" && "details" in response ? (response.details as STHRestAPI.GetStatusResponse) : (response as STHRestAPI.GetStatusResponse);
    }

    /**
     * Returns Host public configuration.
     *
     * @returns {Promise<GetConfigResponse>} Promise resolving to Host configuration (public part).
     */
    async getConfig(): Promise<PublicSTHConfiguration> {
        const response = await this.#_v2Client.get<{ config?: PublicSTHConfiguration } | PublicSTHConfiguration>("config");

        return response && typeof response === "object" && "config" in response ? (response.config as PublicSTHConfiguration) : (response as PublicSTHConfiguration);
    }

    /**
     * Alias for sendTopic
     *
     * @see this.sendTopic
     */
    get sendNamedData() {
        return this.sendTopic;
    }

    /**
     * Sends data to the topic.
     * Topics are a part of Service Discovery feature enabling data exchange through Topics API.
     *
     * @param {string} topic Topic name.
     * @param stream Stream to be piped to topic.
     * @param {RequestInit} requestInit RequestInit object to be passed to fetch.
     * @param {string} [contentType] Content type to be set in headers.
     * @param {boolean} end Indicates if "end" event from stream should be passed to topic.
     * @returns TODO: comment.
     */
    async sendTopic<T>(topic: string, stream: Parameters<HttpClient["sendStream"]>[1], requestInit: RequestInit = {}, contentType: string = "application/x-ndjson", end?: boolean) {
        requestInit.headers ||= {} as Headers;
        (requestInit.headers as Headers).expect = "100-continue";

        return this.client.sendStream<T>(`topic/${topic}`, stream, requestInit, { type: contentType, end: end });
    }

    /**
     * Alias for getTopic
     *
     * @see this.getTopic
     */
    get getNamedData() {
        return this.getTopic;
    }

    /**
     * Returns stream from given topic.
     *
     * @param topic Topic name.
     * @param {RequestInit} requestInit RequestInit object to be passed to fetch.
     * @param {string} [contentType] Content type to be set in headers.
     * @returns Promise resolving to readable stream.
     */
    async getTopic(topic: string, requestInit?: RequestInit, contentType: string = "application/x-ndjson"): ReturnType<HttpClient["getStream"]> {
        return this.client.getStream(`topic/${topic}`, requestInit, { type: contentType });
    }

    async createTopic(id: string, contentType: string): Promise<{ topicName: string }> {
        return this.client.post("topics", { id, "content-type": contentType }, undefined, { json: true, parse: "json" });
    }

    async deleteTopic(id: string): Promise<{ message: string }> {
        return this.client.delete(`topics/${id}`);
    }

    async getTopics(): Promise<STHRestAPI.GetTopicsResponse> {
        return this.client.get("topics");
    }

    async getTopicsV2(): Promise<{ items: Array<{ name: string; contentType: string; origin?: { type: "hub" | "space"; id: string } }> }> {
        return this.#_v2Client.get("topics");
    }

    async createTopicV2(topic: {
        name: string;
        contentType: string;
        origin?: { type: "hub" | "space"; id: string };
    }): Promise<{ operation: { id: string; status: string }; result?: { topic: typeof topic }; error?: { code: string; message: string } }> {
        return this.#_v2Client.post("topics", { topic }, undefined, { json: true, parse: "json" });
    }

    async deleteTopicV2(
        topic: string
    ): Promise<{ operation: { id: string; status: string }; result?: { topic: string; deleted: boolean }; error?: { code: string; message: string } }> {
        return this.#_v2Client.delete(`topics/${topic}`);
    }

    async getTopicV2(topic: string, requestInit?: RequestInit, contentType: string = "application/x-ndjson") {
        return this.#_v2Client.getStream(`topics/${topic}/stream`, requestInit, { type: contentType });
    }

    async sendTopicV2<T>(
        topic: string,
        stream: Parameters<HttpClient["sendStream"]>[1],
        requestInit: RequestInit = {},
        contentType: string = "application/x-ndjson",
        end?: boolean
    ) {
        return this.#_v2Client.sendStream<T>(`topics/${topic}/stream`, stream, requestInit, { type: contentType, end });
    }

    /**
     * Creates InstanceClient based on current HostClient and instance id.
     *
     * @param id Instance id.
     * @returns InstanceClient instance.
     */
    getInstanceClient(id: string) {
        return InstanceClient.from(id, this);
    }

    /**
     * Creates SequenceClient based on current HostClient and instance id.
     *
     * @param id Sequence id.
     * @returns SequenceClient instance.
     */
    getSequenceClient(id: string) {
        return SequenceClient.from(id, this);
    }

    /**
     * Creates ManagerClient for Manager that Hub is connected to.
     *
     * @param apiBase Api base.
     * @param utils ClientUtils
     * @returns ManagerClient
     */
    getManagerClient(apiBase: string = "/api/v1") {
        return new ManagerClient(`${this.apiBase}/cpm${apiBase}`, new ClientUtilsCustomAgent(`${this.apiBase}/cpm${apiBase}`, this.client.agent), createHostClient);
    }
}

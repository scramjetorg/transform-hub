import { ClientProvider, ClientUtils, HttpClient } from "@scramjet/client-utils";
import { STHRestAPI } from "@scramjet/types";
import { InstanceClient } from "./instance-client";
import { SequenceClient } from "./sequence-client";
import { HostHeaders } from "@scramjet/symbols";

/**
 * Host client.
 * Provides methods to interact with Host.
 */
export class HostClient implements ClientProvider {
    apiBase: string;

    #_client: ClientUtils;

    get client(): ClientUtils {
        return this.#_client;
    }

    constructor(apiBase: string, utils = new ClientUtils(apiBase)) {
        this.apiBase = apiBase.replace(/\/$/, "");

        this.#_client = utils;
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
     * Returns list of all Instances on Host.
     *
     * @returns {Promise<STHRestAPI.GetInstancesResponse>} Promise resolving to list of Instances.
     */
    async listInstances() {
        return this.client.get<STHRestAPI.GetInstancesResponse>("instances");
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
    async sendSequence(
        sequencePackage: Parameters<HttpClient["sendStream"]>[1],
        requestInit?: RequestInit,
        update?: boolean
    ): Promise<SequenceClient> {
        const response = await this.client.sendStream<any>("sequence", sequencePackage, requestInit, {
            parseResponse: "json", put: update
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
    async getLoadCheck() {
        return this.client.get<STHRestAPI.GetLoadCheckResponse>("load-check");
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
    async getStatus() {
        return this.client.get<STHRestAPI.GetStatusResponse>("status");
    }

    /**
     * Returns Host public configuration.
     *
     * @returns {Promise<GetConfigResponse>} Promise resolving to Host configuration (public part).
     */
    async getConfig() {
        return this.client.get<STHRestAPI.GetConfigResponse>("config");
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
    async sendNamedData<T>(
        topic: string,
        stream: Parameters<HttpClient["sendStream"]>[1],
        requestInit?: RequestInit,
        contentType?: string,
        end?: boolean
    ) {
        return this.client.sendStream<T>(`topic/${topic}`, stream, requestInit, { type: contentType, end: end });
    }

    /**
     * Returns stream from given topic.
     *
     * @param topic Topic name.
     * @param {RequestInit} requestInit RequestInit object to be passed to fetch.
     * @returns Promise resolving to readable stream.
     */
    async getNamedData(topic: string, requestInit?: RequestInit): ReturnType<HttpClient["getStream"]> {
        return this.client.getStream(`topic/${topic}`, requestInit);
    }

    async getTopics(): Promise<STHRestAPI.GetTopicsResponse> {
        return this.client.get("topics");
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
}

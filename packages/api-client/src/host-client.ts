import { Readable, Stream } from "stream";
import { ClientUtils } from "@scramjet/client-utils";
import { SequenceClient } from "./sequence-client";
import { ClientProvider } from "./types";
import { STHRestAPI } from "@scramjet/types";

/**
 * Host client.
 * Provides methods to interact with Host.
 */
export class HostClient implements ClientProvider {
    apiBase: string;
    client: ClientUtils;

    constructor(apiBase: string, utils = new ClientUtils(apiBase)) {
        this.apiBase = apiBase.replace(/\/$/, "");

        this.client = utils;
    }

    /**
     * Returns list of all sequences on Host.
     *
     * @returns {Promise<STHRestAPI.GetSequencesResponse[]>} Promise resolving to response with list.
     */
    async listSequences() {
        return this.client.get<STHRestAPI.GetSequencesResponse>("sequences");
    }

    /**
     * Returns list of all instances on Host.
     *
     * @returns {Promise<STHRestAPI.GetInstancesResponse>} Promise resolving to response with list.
     */
    async listInstances() {
        return this.client.get<STHRestAPI.GetInstancesResponse>("instances");
    }

    /**
     * Returns Host log stream.
     *
     * @returns {Promise<Response>} Promise resolving to response with log stream.
     */
    async getLogStream(): Promise<Stream | ReadableStream> {
        return this.client.getStream("log");
    }

    /**
     * Uploads sequence to Host.
     *
     * @param sequencePackage Stream with packad sequence.
     * @returns {SequenceClient} Sequence client.
     */
    async sendSequence(sequencePackage: Readable): Promise<SequenceClient> {
        const response = await this.client.sendStream<any>("sequence", sequencePackage, {
            parseResponse: "json",
        });

        return SequenceClient.from(response.id, this);
    }

    /**
     * Returns sequence details.
     *
     * @param {string} sequenceId Seqeuence id.
     * @returns Object with sequence details.
     */
    async getSequence(sequenceId: string) {
        return this.client.get<STHRestAPI.GetSequenceResponse>(`sequence/${sequenceId}`);
    }

    /**
     * Deletes sequence with given id.
     *
     * @param {string} sequenceId Sequence id
     * @returns TODO: comment.
     */
    async deleteSequence(sequenceId: string): Promise<STHRestAPI.DeleteSequenceResponse> {
        return this.client.delete<STHRestAPI.DeleteSequenceResponse>(`sequence/${sequenceId}`);
    }

    // REVIEW: move this to InstanceClient..getInfo()?
    /**
     * Returns instance details.
     *
     * @param {string} instanceId Instance id.
     * @returns Instance details.
     */
    async getInstanceInfo(instanceId: string) {
        return this.client.get<STHRestAPI.GetInstanceResponse>(`instance/${instanceId}`);
    }

    /**
     * Returns Host load-check.
     *
     * @returns {Promise<Response>} Promise resolving to Host load check data.
     */
    async getLoadCheck() {
        return this.client.get<STHRestAPI.GetLoadCheckResponse>("load-check");
    }

    /**
     * Returns Host version.
     *
     * @returns {Promise<Response>} Promise resolving to Host version.
     */
    async getVersion() {
        return this.client.get<STHRestAPI.GetVersionResponse>("version");
    }

    /**
     * Sends data to the topic.
     * Topics are a part of Service Discovery feature enabling data exchange through Topics API.
     *
     * @param {string} topic Topic name.
     * @param {Readable} stream Stream to be piped to topic.
     * @param {string} [contentType] Content type to be set in headers.
     * @param {boolean} end Indicates if "end" event from stream should be passed to topic.
     * @returns TODO: comment.
     */
    async sendNamedData<T>(topic: string, stream: Readable, contentType?: string, end?: boolean) {
        return this.client.sendStream<T>(`topic/${topic}`, stream, { type: contentType, end: end });
    }

    /**
     * Returns stream from given topic.
     *
     * @param topic Topic name.
     * @returns Promise resolving to stream.
     */
    async getNamedData(topic: string): Promise<Stream> {
        return this.client.getStream(`topic/${topic}`);
    }
}

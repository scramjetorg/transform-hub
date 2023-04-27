import { ClientProvider, HttpClient } from "@scramjet/client-utils";
import { STHRestAPI } from "@scramjet/types";
import { Readable } from "stream";

import { InstanceClient } from "./instance-client";

/**
 * Sequence client.
 * Provides methods to interact with Sequence.
 */
export class SequenceClient {
    private _id: string;
    private sequenceURL: string;
    private host: ClientProvider;

    /**
     * Sequence id.
     */
    public get id(): string {
        return this._id;
    }

    private get clientUtils(): HttpClient {
        return this.host.client;
    }

    /**
     * Creates SequenceClient instance for Sequence with given id and host.
     *
     * @param {string} id Sequence id
     * @param {ClientProvider} host Host client
     * @returns Sequence client
     */
    static from(id: string, host: ClientProvider): SequenceClient {
        return new this(id, host);
    }

    private constructor(id: string, host: ClientProvider) {
        if (!id) {
            throw new Error("No id provided");
        }

        this._id = id;
        this.host = host;
        this.sequenceURL = `sequence/${id}`;
    }

    /**
     * Starts Sequence.
     *
     * @param {STHRestAPI.StartSequencePayload} payload App start configuration.
     * @returns {Promise<InstanceClient>} Promise resolving to Instance Client.
     */
    async start(payload: STHRestAPI.StartSequencePayload): Promise<InstanceClient> {
        try {
            const response = await this.clientUtils.post<STHRestAPI.StartSequenceResponse>(
                `${this.sequenceURL}/start`,
                payload,
                {},
                { json: true, parse: "json", throwOnErrorHttpCode: true }
            );

            return InstanceClient.from(response.id, this.host);
        } catch (error: any) {
            return Promise.reject(JSON.parse(error.body)?.error || error);
        }
    }

    /**
     * Returns list of all Instances created from Sequence.
     *
     * @returns {Promise<string[]>} Promise resolving to list of Instances.
     */
    async listInstances() {
        return this.clientUtils.get<string[]>(`${this.sequenceURL}/instances`);
    }

    /**
     * Return Instance Client for given Instance id.
     *
     * @param {string} id Instance id.
     * @param {ClientProvider} host Host client.
     * @returns {InstanceClient} Instance client.
     */
    async getInstance(id: string, host: ClientProvider = this.host) {
        return InstanceClient.from(id, host);
    }

    /**
     * Returns Sequence details.
     *
     * @returns {Promise<STHRestAPI.GetSequenceResponse>} Promise resolving to Sequence info.
     */
    async getInfo() {
        return this.clientUtils.get<STHRestAPI.GetSequenceResponse>(this.sequenceURL);
    }

    async overwrite(stream: Readable) {
        const response = await this.clientUtils.sendStream<any>("sequence", stream, { method: "PUT" }, {
            parseResponse: "json"
        });

        return SequenceClient.from(response.id, this.host);
    }
}

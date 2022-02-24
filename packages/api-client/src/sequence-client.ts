import { ClientError, ClientProvider, HttpClient } from "@scramjet/client-utils";
import { STHRestAPI } from "@scramjet/types";

import { InstanceClient } from "./instance-client";

/**
 * Sequence client.
 * Provides methods to interact with sequence.
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
     * Creates SequenceClient instance for sequence with given id and host.
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
     * Starts sequence.
     *
     * @param {any} appConfig Configuration to be passed to Instance context.
     * @param {any} args Arguments to be passed to first function in Sequence.
     * @returns {Promise<InstanceClient>} Promise resolving to Instance Client.
     */
    async start(appConfig: any, args: any): Promise<InstanceClient> {
        const response = await this.clientUtils.post<STHRestAPI.StartSequenceResponse>(
            `${this.sequenceURL}/start`,
            { appConfig, args },
            {},
            { json: true, parse: "json" }
        );

        if (response.id) {
            return InstanceClient.from(response.id, this.host);
        }

        throw new ClientError("INVALID_RESPONSE", "Response did not include instance id.");
    }

    /**
     * Returns list of all instances creteated from sequnece.
     *
     * @returns {Promise<string[]>} Promise resolving to list of Instances.
     */
    async listInstances() {
        return this.clientUtils.get<string[]>(`${this.sequenceURL}/instances`);
    }

    /**
     * Return Instance Client for given instance id.
     *
     * @param {string} id Instance id.
     * @param {ClientProvider} host Host client.
     * @returns {InstanceClient} Instance client.
     */
    async getInstance(id: string, host: ClientProvider) {
        return InstanceClient.from(id, host);
    }

    /**
     * Returns sequence details.
     *
     * @returns {Promise<STHRestAPI.GetSequenceResponse>} Promise resolving to Sequence info.
     */
    async getInfo() {
        return this.clientUtils.get<STHRestAPI.GetSequenceResponse>(this.sequenceURL);
    }

    /**
     * Not implemented.
     */
    async overwrite() {
        throw Error("Not yet implemented");
    }
}

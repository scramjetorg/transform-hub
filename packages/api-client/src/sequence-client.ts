import { IDProvider } from "@scramjet/model";
import { ClientError } from "./client-error";
import { InstanceClient } from "./instance-client";
import { ClientProvider, HttpClient } from "./types";

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
        if (!IDProvider.isValid(id)) {
            throw new Error(`Invalid id: ${id}`);
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
     * @returns {Promise<InstanceClient>} Promise which resolves with instance client.
     */
    async start(appConfig: any, args: any): Promise<InstanceClient> {
        const response = await this.clientUtils.post<{ id: string }>(
            `${this.sequenceURL}/start`, { appConfig, args }, {}, { json: true, parseResponse: "json" }
        );

        if (response.id) {
            return InstanceClient.from(response.id, this.host);
        }

        throw new ClientError("INVALID_RESPONSE", "Response did not include instance id.");
    }

    /**
     * Returns list of all instances creteated from sequnece.
     *
     * @returns List of instances
     */
    async listInstances() {
        return this.clientUtils.get(`${this.sequenceURL}/instances`);
    }

    /**
     * TODO:
     *
     * @param {string} id TODO:
     * @param {ClientProvider} host Host client.
     * @returns {InstanceClient} Instance client.
     */
    async getInstance(id: string, host: ClientProvider) {
        return InstanceClient.from(id, host);
    }

    /**
     * Returns sequence details.
     *
     * @returns Promise which resolves with sequence info.
     */
    async getInfo() {
        return this.clientUtils.get(this.sequenceURL);
    }

    /**
     * TODO: comment.
     */
    async overwrite() {
        throw Error("Not yet implemented");
    }
}

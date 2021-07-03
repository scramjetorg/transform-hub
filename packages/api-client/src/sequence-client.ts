import { IDProvider } from "@scramjet/model";
import { ClientError } from "./client-utils";
import { InstanceClient } from "./instance-client";
import { ClientProvider, HttpClient } from "./types";

export class SequenceClient {
    private _id: string;
    private sequenceURL: string;
    private host: ClientProvider;

    public get id(): string {
        return this._id;
    }

    private get clientUtils(): HttpClient {
        return this.host.client;
    }

    static from(id: string, host: ClientProvider): SequenceClient {
        return new this(id, host);
    }

    private constructor(id: string, host: ClientProvider) {
        if (!IDProvider.isValid(id)) {
            throw new Error("Invalid id.");
        }

        this._id = id;
        this.host = host;
        this.sequenceURL = `sequence/${id}`;
    }

    async start(appConfig: any, args: any): Promise<InstanceClient | undefined> {
        const response = await this.clientUtils.post(
            `${this.sequenceURL}/start`, { appConfig, args }
        );

        if (response.data?.id) {
            return InstanceClient.from(response.data.id, this.host);
        }
        throw new ClientError(4, "Response did not include instance id.");

    }

    async listInstances() {
        return this.clientUtils.get(`${this.sequenceURL}/instances`);
    }

    async getInstance(id: string, host: ClientProvider) {
        return InstanceClient.from(id, host);
    }

    async getInfo() {
        return this.clientUtils.get(this.sequenceURL);
    }

    async overwrite() {
        throw Error("Not yet implemented");
    }
}

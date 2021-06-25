import { IDProvider } from "@scramjet/model";
import { AxiosError } from "axios";
import { clientUtils } from "./client-utils";
import { InstanceClient } from "./instance-client";

export class SequenceClient {
    private _id: string;
    private sequenceURL: string;

    public get id(): string {
        return this._id;
    }

    static from(id: string): SequenceClient {
        return new this(id);
    }

    private constructor(id: string) {
        if (!clientUtils.initialized) {
            throw new Error("ClientUtils not initialized");
        }

        if (!IDProvider.isValid(id)) {
            throw new Error("Invalid id.");
        }

        this._id = id;
        this.sequenceURL = `sequence/${id}`;

        console.log("New sequence:", this.id);
    }

    async start(appConfig: any, args: any): Promise<InstanceClient | undefined> {
        const response = await clientUtils.post(
            `${this.sequenceURL}/start`, {
                appConfig,
                args
            }
        ).catch((error: AxiosError) => {
            console.log(error);
            return {
                ...error.response
            };
        });

        if (response.data?.id) {
            return InstanceClient.from(response.data.id);
        }

        return response.data?.error;
    }

    async listInstances() {
        return clientUtils.get(`${this.sequenceURL}/instances`);
    }

    async getInstance(id: string) {
        return InstanceClient.from(id);
    }

    async getInfo() {
        return clientUtils.get(this.sequenceURL);
    }

    async overwrite() {
        throw Error("Not yet implemented");
    }
}

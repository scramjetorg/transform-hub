import { clientUtils } from "./client-utils";
import { InstanceClient } from "./instance-client";

export class SequenceClient {
    private _id: string;
    private sequenceURL: string;

    public get id(): string {
        return this._id;
    }

    static from(id: string): SequenceClient {
        return id ? new this(id) : undefined;
    }

    private constructor(id: string) {
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
        );

        if (response?.data.id) {
            return InstanceClient.from(response.data.id);
        }

        return undefined;
    }
}

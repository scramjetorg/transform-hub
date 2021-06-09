import { clientUtils } from "./client-utils";
import { InstanceClient } from "./instance-client";

type SequenceClientConfig = {
    apiBase: string;
}

export class SequenceClient {
    private _id: string;
    private apiBase: string;
    private sequenceURL: string;

    public get id(): string {
        return this._id;
    }

    constructor(id: string, options: SequenceClientConfig) {
        this._id = id;
        this.apiBase = options.apiBase;
        this.sequenceURL = `${options.apiBase}/sequence/${id}`;

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
            return new InstanceClient(response.data.id, {
                apiBase: this.apiBase
            });
        }

        return undefined;
    }
}

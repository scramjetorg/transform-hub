import { clientUtils } from "./client-utils";
import { RunnerMessageCode } from "@scramjet/symbols";

type InstanceClientOptions = {
    apiBase: string;
}

export class InstanceClient {
    private _id: string;
    private instanceURL: string;

    public get id(): string {
        return this._id;
    }

    constructor(id: string, options: InstanceClientOptions) {
        this._id = id;
        this.instanceURL = `${options.apiBase}/instance/${this._id}`;

        console.log("New instance client:", this.id);
    }

    async stop(timeout: number, canCallKeepalive: boolean) {
        await clientUtils.post(`${this.instanceURL}/_stop`, [
            RunnerMessageCode.STOP, {
                timeout,
                canCallKeepalive
            }]);
    }

    async sendEvent(eventName: string, message: string) {
        const data = [
            RunnerMessageCode.EVENT, {
                eventName,
                message
            }];

        await clientUtils.post(`${this.instanceURL}/_event`, data);
    }

    async getEvent() {
        return clientUtils.get(`${this.instanceURL}/event`);
    }
}

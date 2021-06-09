import { clientUtils, Response } from "./client-utils";
import { RunnerMessageCode } from "@scramjet/symbols";
import { EncodedControlMessage } from "@scramjet/types";
import { Stream } from "stream";

type InstanceClientConfig = {
    apiBase: string;
}

export class InstanceClient {
    private _id: string;
    private instanceURL: string;

    public get id(): string {
        return this._id;
    }

    constructor(id: string, options: InstanceClientConfig) {
        this._id = id;
        this.instanceURL = `${options.apiBase}/instance/${this._id}`;

        console.log("New instance:", this.id);
    }

    async stop(timeout: number, canCallKeepalive: boolean): Promise<Response> {
        return clientUtils.post(`${this.instanceURL}/_stop`, [
            RunnerMessageCode.STOP, {
                timeout,
                canCallKeepalive
            }] as EncodedControlMessage);
    }

    async kill(): Promise<Response | undefined> {
        return clientUtils.post(`${this.instanceURL}/_kill`, [
            RunnerMessageCode.KILL,
            {}
        ] as EncodedControlMessage);
    }

    async sendEvent(eventName: string, message: string): Promise<Response> {
        const data = [
            RunnerMessageCode.EVENT, {
                eventName,
                message
            }] as EncodedControlMessage;

        return clientUtils.post(`${this.instanceURL}/_event`, data);
    }

    async getEvent() {
        return clientUtils.get(`${this.instanceURL}/event`);
    }

    async getHealth() {
        return clientUtils.get(`${this.instanceURL}/health`);
    }

    async getStream(stream: string): Promise<Response> {
        return clientUtils.getStream(`${this.instanceURL}/${stream}`);
    }

    async sendStream(streamId: string, stream: Stream | string) {
        return clientUtils.sendStream(`${this.instanceURL}/${streamId}`, stream);
    }

    async sendInput(stream: Stream | string) {
        return this.sendStream("input", stream);
    }
}

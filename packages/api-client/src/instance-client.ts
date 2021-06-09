import { clientUtils, Response } from "./client-utils";
import { RunnerMessageCode } from "@scramjet/symbols";
import { EncodedControlMessage } from "@scramjet/types";
import { Stream } from "stream";
import { IDProvider } from "@scramjet/model";

export type InstanceInputStream = "stdin" | "input";
export type InstanceOutputStream = "stdout" | "stderr" | "output"

export class InstanceClient {
    private _id: string;
    private instanceURL: string;

    public get id(): string {
        return this._id;
    }

    static from(id: string): InstanceClient {
        return new this(id);
    }

    private constructor(id: string) {
        if (!IDProvider.isValid(id)) {
            throw new Error("Invalid id.");
        }

        this._id = id;
        this.instanceURL = `instance/${this._id}`;
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

    async getStatus() {
        return clientUtils.get(`${this.instanceURL}/status`);
    }

    async getStream(streamId: InstanceOutputStream): Promise<Response> {
        return clientUtils.getStream(`${this.instanceURL}/${streamId}`);
    }

    async sendStream(streamId: InstanceInputStream, stream: Stream | string) {
        return clientUtils.sendStream(`${this.instanceURL}/${streamId}`, stream);
    }

    async sendInput(stream: Stream | string) {
        return this.sendStream("input", stream);
    }
}

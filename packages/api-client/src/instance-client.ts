import { ClientUtils, Response, ResponseStream, SendStreamOptions } from "./client-utils";
import { RunnerMessageCode } from "@scramjet/symbols";
import { EncodedControlMessage } from "@scramjet/types";
import { Stream } from "stream";
import { IDProvider } from "@scramjet/model";
import { ClientProvider } from "./types/client-provider";

export type InstanceInputStream = "stdin" | "input";
export type InstanceOutputStream = "stdout" | "stderr" | "output" | "log"

export class InstanceClient {
    private _id: string;
    private instanceURL: string;
    private host: ClientProvider;

    public get id(): string {
        return this._id;
    }

    private get clientUtils(): ClientUtils {
        return this.host.clientUtils;
    }

    static from(id: string, host: ClientProvider): InstanceClient {
        return new this(id, host);
    }

    private constructor(id: string, host: ClientProvider) {
        this.host = host;
        if (!IDProvider.isValid(id)) {
            throw new Error("Invalid id.");
        }

        this._id = id;
        this.instanceURL = `instance/${this._id}`;

    }

    async stop(timeout: number, canCallKeepalive: boolean): Promise<Response> {
        return this.clientUtils.post(`${this.instanceURL}/_stop`, [
            RunnerMessageCode.STOP, {
                timeout,
                canCallKeepalive
            }] as EncodedControlMessage);
    }

    async kill(): Promise<Response> {
        return this.clientUtils.post(`${this.instanceURL}/_kill`, [
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

        return this.clientUtils.post(`${this.instanceURL}/_event`, data);
    }

    async getEvent() {
        return this.clientUtils.get(`${this.instanceURL}/event`);
    }

    async getHealth() {
        return this.clientUtils.get(`${this.instanceURL}/health`);
    }

    async getStatus() {
        return this.clientUtils.get(`${this.instanceURL}/status`);
    }

    async getInfo() {
        return this.clientUtils.get(`${this.instanceURL}`);
    }

    async getStream(streamId: InstanceOutputStream): Promise<ResponseStream> {
        return this.clientUtils.getStream(`${this.instanceURL}/${streamId}`);
    }

    async sendStream(streamId: InstanceInputStream, stream: Stream | string, options?: SendStreamOptions) {
        return this.clientUtils.sendStream(`${this.instanceURL}/${streamId}`, stream, options);
    }

    async sendInput(stream: Stream | string) {
        return this.sendStream("input", stream);
    }

    async sendStdin(stream: Stream | string) {
        return this.sendStream("stdin", stream);
    }
}

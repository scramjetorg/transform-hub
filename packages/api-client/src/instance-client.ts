import { Response, ResponseStream, SendStreamOptions, ClientProvider, HttpClient } from "./types";
import { RunnerMessageCode } from "@scramjet/symbols";
import { EncodedControlMessage } from "@scramjet/types";
import { Stream } from "stream";
import { IDProvider } from "@scramjet/model";

export type InstanceInputStream = "stdin" | "input";
export type InstanceOutputStream = "stdout" | "stderr" | "output" | "log"

export class InstanceClient {
    private _id: string;
    private instanceURL: string;
    private host: ClientProvider;

    public get id(): string {
        return this._id;
    }

    private get clientUtils(): HttpClient {
        return this.host.client;
    }

    static from(id: string, host: ClientProvider): InstanceClient {
        return new this(id, host);
    }

    private constructor(id: string, host: ClientProvider) {
        this.host = host;
        if (!IDProvider.isValid(id)) {
            throw new Error(`Invalid id: ${id}`);
        }

        this._id = id;
        this.instanceURL = `instance/${this._id}`;

    }

    async stop(timeout: number, canCallKeepalive: boolean): Promise<Response> {
        return this.clientUtils.post(`${this.instanceURL}/_stop`, [
            RunnerMessageCode.STOP, {
                timeout,
                canCallKeepalive
            }] as EncodedControlMessage,
        {}, { json: true });
    }

    async kill(): Promise<Response> {
        return this.clientUtils.post(`${this.instanceURL}/_kill`, [
            RunnerMessageCode.KILL,
            {}
        ] as EncodedControlMessage,
        {}, { json: true }
        );
    }

    async sendEvent(eventName: string, message: string): Promise<Response> {
        const data = [
            RunnerMessageCode.EVENT, {
                eventName,
                message
            }] as EncodedControlMessage;

        return this.clientUtils.post(`${this.instanceURL}/_event`, data, {}, { json: true });
    }

    async getNextEvent(eventName: string) {
        return this.clientUtils.get(`${this.instanceURL}/once/${eventName}`);
    }

    async getEvent(eventName: string) {
        return this.clientUtils.get(`${this.instanceURL}/event/${eventName}`);
    }

    /**
     * Fetches event
     *
     * @param eventName - event name
     * @param previous - return old event if was ever fired
     * @returns stream of events from instance
     **/
    async getEventStream(eventName: string) {
        return this.clientUtils.getStream(`${this.instanceURL}/events/${eventName}`);
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

    async sendInput(stream: Stream | string, options ?: SendStreamOptions) {
        return this.sendStream("input", stream, options);
    }

    async sendStdin(stream: Stream | string) {
        return this.sendStream("stdin", stream);
    }
}

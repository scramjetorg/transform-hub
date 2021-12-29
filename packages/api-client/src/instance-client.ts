import { Response, ResponseStream, SendStreamOptions, ClientProvider, HttpClient } from "./types";
import { RunnerMessageCode } from "@scramjet/symbols";
import { EncodedControlMessage } from "@scramjet/types";
import { Stream } from "stream";
import { IDProvider } from "@scramjet/model";

export type InstanceInputStream = "stdin" | "input";
export type InstanceOutputStream = "stdout" | "stderr" | "output" | "log"

/**
 * Instance client.
 * Provides methods to interact with instance.
 */
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

    /**
     * Creates and returns InstanceClient for given id and host.
     *
     * @param {string} id Instance id
     * @param {Clienthost} host Host client.
     * @returns {InstanceClient} Instance client.
     */
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

    /**
     * Send stop command to instance.
     *
     * @param {number} timeout Timeout in milliseconds to graceful stop
     * @param {boolean} canCallKeepalive If true, instance can call keepAlive.
     * @returns {Promise<Response>} TODO: comment
     */
    async stop(timeout: number, canCallKeepalive: boolean): Promise<Response> {
        return this.clientUtils.post(`${this.instanceURL}/_stop`, [
            RunnerMessageCode.STOP, {
                timeout,
                canCallKeepalive
            }] as EncodedControlMessage,
        {}, { json: true });
    }

    /**
     * Send kill command to instance
     *
     * @returns {Promise<Response>} TODO: comment.
     */
    async kill(): Promise<Response> {
        return this.clientUtils.post(`${this.instanceURL}/_kill`, [
            RunnerMessageCode.KILL,
            {}
        ] as EncodedControlMessage,
        {}, { json: true }
        );
    }

    /**
     * Sends event to the Instance.
     *
     * @param {string} eventName Event name.
     * @param {string} message Event data to send.
     * @returns {Promise<Response>} TODO: comment.
     */
    async sendEvent(eventName: string, message: string): Promise<Response> {
        const data = [
            RunnerMessageCode.EVENT, {
                eventName,
                message
            }] as EncodedControlMessage;

        return this.clientUtils.post(`${this.instanceURL}/_event`, data, {}, { json: true });
    }

    /**
     * Waits and returns next event sent by instance.
     *
     * @param {string} eventName Event name.
     * @returns {Promise<Response>} Promise resolving with event data.
     */
    async getNextEvent(eventName: string) {
        return this.clientUtils.get(`${this.instanceURL}/once/${eventName}`);
    }

    /**
     * Return last data from event givent in eventName.
     * Waits for event if it was never fired.
     *
     * @param {string} eventName Event name.
     * @returns {Promise<Response>} Promise resolving with event data.
     */
    async getEvent(eventName: string) {
        return this.clientUtils.get(`${this.instanceURL}/event/${eventName}`);
    }

    /**
     * Fetches event
     *
     * @param {string} eventName - event name
     * @returns stream of events from instance
     **/
    async getEventStream(eventName: string) {
        return this.clientUtils.getStream(`${this.instanceURL}/events/${eventName}`);
    }

    /**
     * Returns instance health.
     */
    async getHealth() {
        return this.clientUtils.get(`${this.instanceURL}/health`);
    }

    /**
     * Returns instance status.
     */
    async getStatus() {
        return this.clientUtils.get(`${this.instanceURL}/status`);
    }

    /**
     * Returns instance info.
     */
    async getInfo() {
        return this.clientUtils.get(`${this.instanceURL}`);
    }

    /**
     * Returns readable stream from instance.
     * Stream can be one of type {@link InstanceOutputStream}.
     *
     * @param {string} streamId Stream id.
     * @returns Promise resolving to stream.
     */
    async getStream(streamId: InstanceOutputStream): Promise<ResponseStream> {
        return this.clientUtils.getStream(`${this.instanceURL}/${streamId}`);
    }

    /**
     * Sends stream to one of the instance inputs.
     *
     *
     * @param {string} streamId Target input stream.
     * @param {stream|string} stream Stream to send.
     * @param {SendStreamOptions} [options] Stream options.
     * @returns Promise resolving to stream.
     */
    async sendStream(streamId: InstanceInputStream, stream: Stream | string, options?: SendStreamOptions) {
        return this.clientUtils.sendStream(`${this.instanceURL}/${streamId}`, stream, options);
    }

    /**
     * Pipes given stream to instance "input".
     *
     * @param {Stream|string} stream Stream to be piped. Or string writen to "stdin" stream.
     * @param {SendStreamOptions} options Request options
     * @returns {Promise<Response>} Promise resolving to response.
     */
    async sendInput(stream: Stream | string, options ?: SendStreamOptions) {
        return this.sendStream("input", stream, options);
    }

    /**
     * Pipes given stream to instance "stdin".
     *
     * @param {Stream|string} stream Stream to be piped. Or string writen to "stdin" stream.
     * @returns {Promise<Response>} Promise resolving to response.
     */
    async sendStdin(stream: Stream | string) {
        return this.sendStream("stdin", stream);
    }
}

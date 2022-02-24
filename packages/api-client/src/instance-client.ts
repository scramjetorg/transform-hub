import { RunnerMessageCode } from "@scramjet/symbols";
import { EncodedControlMessage, STHRestAPI } from "@scramjet/types";
import { ClientProvider, HttpClient, SendStreamOptions } from "@scramjet/client-utils";

export type InstanceInputStream = "stdin" | "input";
export type InstanceOutputStream = "stdout" | "stderr" | "output" | "log";

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

        if (!id) {
            throw new Error("No id provided");
        }

        this._id = id;
        this.instanceURL = `instance/${this._id}`;
    }

    /**
     * Send stop command to instance.
     *
     * @param {number} timeout Timeout in milliseconds to graceful stop
     * @param {boolean} canCallKeepalive If true, instance can call keepAlive.
     * @returns {Promise<SendStopInstanceResponse>} Promise resolving to stop Instance result.
     */
    async stop(timeout: number, canCallKeepalive: boolean): Promise<STHRestAPI.SendStopInstanceResponse> {
        return this.clientUtils.post<STHRestAPI.SendStopInstanceResponse>(
            `${this.instanceURL}/_stop`,
            [
                RunnerMessageCode.STOP,
                {
                    timeout,
                    canCallKeepalive,
                },
            ] as EncodedControlMessage,
            {},
            { json: true, parse: "json" }
        );
    }

    /**
     * Send kill command to instance
     *
     * @returns {Promise<SendKillInstanceResponse>} Promise resolving to kill Instance result.
     */
    async kill(): Promise<STHRestAPI.SendKillInstanceResponse> {
        return this.clientUtils.post<STHRestAPI.SendKillInstanceResponse>(
            `${this.instanceURL}/_kill`,
            [RunnerMessageCode.KILL, {}] as EncodedControlMessage,
            {},
            { json: true, parse: "json" }
        );
    }

    /**
     * Sends event to the Instance.
     *
     * @param {string} eventName Event name.
     * @param {string} message Event data to send.
     * @returns {Promise<STHRestAPI.SendEventResponse>} Promise resolving to send event result.
     */
    async sendEvent(eventName: string, message: string) {
        const data = [
            RunnerMessageCode.EVENT,
            {
                eventName,
                message,
            },
        ] as EncodedControlMessage;

        return this.clientUtils.post<STHRestAPI.SendEventResponse>(`${this.instanceURL}/_event`, data, {}, { json: true, parse: "json" });
    }

    /**
     * Waits and returns next event sent by instance.
     *
     * @param {string} eventName Event name.
     * @returns {Promise<STHRestAPI.GetEventResponse>} Promise resolving to event data.
     */
    async getNextEvent(eventName: string) {
        return this.clientUtils.get<STHRestAPI.GetEventResponse>(`${this.instanceURL}/once/${eventName}`);
    }

    /**
     * Return last data from event givent in eventName.
     * Waits for event if it was never fired.
     *
     * @param {string} eventName Event name.
     * @returns {Promise<STHRestAPI.GetEventResponse>} Promise resolving to event data.
     */
    async getEvent(eventName: string) {
        return this.clientUtils.get<STHRestAPI.GetEventResponse>(`${this.instanceURL}/event/${eventName}`);
    }

    /**
     * Fetches event
     *
     * @param {string} eventName - event name
     * @returns stream of events from Instance
     **/
    async getEventStream(eventName: string) {
        return this.clientUtils.getStream(`${this.instanceURL}/events/${eventName}`);
    }

    /**
     * Returns instance health.
     *
     * @returns {Promise<STHRestAPI.GetInstanceHealthResponse>} Promise resolving to Instance health.
     */
    async getHealth() {
        return this.clientUtils.get<STHRestAPI.GetHealthResponse>(`${this.instanceURL}/health`);
    }

    /**
     * Returns instance info.
     *
     * @returns {Promise<STHRestAPI.GetInstanceResponse>} Promise resolving to Instance info.
     */
    async getInfo() {
        return this.clientUtils.get<STHRestAPI.GetInstanceResponse>(`${this.instanceURL}`);
    }

    /**
     * Returns readable stream from instance.
     * Stream can be one of type {@link InstanceOutputStream}.
     *
     * @param {string} streamId Stream id.
     * @returns Promise resolving to readable stream.
     */
    async getStream(streamId: InstanceOutputStream): ReturnType<HttpClient["getStream"]> {
        return this.clientUtils.getStream(`${this.instanceURL}/${streamId}`);
    }

    /**
     * Sends stream to one of the instance inputs.
     *
     * @param {string} streamId Target input stream.
     * @param {Readable|string} stream Stream to send.
     * @param {SendStreamOptions} [options] Stream options.
     * @returns {Promise<STHRestAPI.SendStreamResponse>} Promise resolving to send stream result.
     */
    async sendStream(streamId: InstanceInputStream, stream: Parameters<HttpClient["sendStream"]>[1] | string, options?: SendStreamOptions) {
        return this.clientUtils.sendStream<any>(`${this.instanceURL}/${streamId}`, stream, options);
    }

    /**
     * Pipes given stream to instance "input".
     *
     * @param {Readable|string} stream Stream to be piped. Or string writen to "stdin" stream.
     * @param {SendStreamOptions} options Request options
     * @returns {Promise<STHRestAPI.SendStreamResponse>} Promise resolving to send stream result.
     */
    async sendInput(stream: Parameters<HttpClient["sendStream"]>[1] | string, options?: SendStreamOptions) {
        return this.sendStream("input", stream, options);
    }

    /**
     * Pipes given stream to instance "stdin".
     *
     * @param {Readable|string} stream Stream to be piped. Or string writen to "stdin" stream.
     * @returns {Promise<STHRestAPI.SendStreamResponse>} Promise resolving to send stream result.
     */
    async sendStdin(stream: Parameters<HttpClient["sendStream"]>[1] | string) {
        return this.sendStream("stdin", stream);
    }
}

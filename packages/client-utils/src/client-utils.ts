/* eslint-disable no-console */
import { ClientError } from "./client-error";
import { Headers, HttpClient, RequestLogger, SendStreamOptions, RequestConfig } from "./types";

/**
 * Provides HTTP communication methods.
 */
export class ClientUtilsBase implements HttpClient {
    fetch!: any;

    apiBase: string = "";

    private log?: RequestLogger;

    constructor(apiBase: string) {
        this.apiBase = apiBase;
    }

    /**
     * Sets given logger.
     *
     * @param {Partial<RequestLogger>} logger Logger to set.
     */
    public addLogger(logger: Partial<RequestLogger>) {
        this.log = {
            request: () => 0,
            ok: () => 0,
            error: () => 0,
            ...logger
        };
    }

    /**
     * Request wrapper.
     */
    private async safeRequest<T>(input: RequestInfo, init: RequestInit, options: RequestConfig = { parse: "stream" }) {
        const source = new Error();

        try {
            const response = await this.fetch(input, init);

            if (response.status >= 400) {
                if (this.log) {
                    this.log?.error(new ClientError(response.status, response.statusText, response.error));
                }

                throw new ClientError(response.status, response.statusText, response.error);
            }

            if (this.log) {
                this.log?.ok(response);
            }

            if (this.log) {
                this.log.request(arguments);
            }

            if (options.parse === "json") {
                return response.json() as Promise<T>;
            }

            if (options.parse === "text") {
                return response.text() as Promise<T>;
            }

            if (options.parse === "stream") {
                return response.body as Promise<T>;
            }
        } catch (error: any) {
            throw ClientError.from(error, undefined, source);
        }

        throw ClientError.from(source, undefined, source);
    }

    /**
     * Performs get request.
     *
     * @param {string} url Request URL.
     * @returns Fetch response.
     */
    async get<T>(url: string): Promise<T> {
        return this.safeRequest<T>(`${this.apiBase}/${url}`, {}, { parse: "json" });
    }

    /**
     * Performs get request for streamed data.
     *
     * @param {string} url Request URL.
     * @returns Fetch response.
     */
    async getStream(url: string) {
        return this.safeRequest<any>(`${this.apiBase}/${url}`, {});
    }

    /**
     * Performs POST request.
     *
     * @param url Request URL.
     * @param data Data to be send.
     * @param headers Request headers.
     * @param config Request config.
     * @returns Fetch response.
     */
    async post<T>(
        url: string,
        data: any,
        headers: Headers = {},
        config: RequestConfig = { parse: "stream", json: false }
    ): Promise<T> {
        if (config.json) {
            headers["Content-Type"] = "application/json";
            data = JSON.stringify(data);
        }

        return this.safeRequest<T>(
            `${this.apiBase}/${url}`,
            {
                method: "post",
                body: data,
                headers,
            },
            config
        );
    }

    /**
     * Performs DELETE request.
     *
     * @param url Request URL.
     * @returns Fetch response.
     */
    async delete<T>(url: string): Promise<T> {
        return this.safeRequest<T>(
            `${this.apiBase}/${url}`,
            {
                method: "delete",
                headers: {
                    "Content-Type": "application/json",
                },
            },
            { parse: "json" }
        );
    }

    /**
     * Performs POST request for streamed data.
     *
     * @param {string} url Request url.
     * @param {Stream|string} stream to be send.

     * @returns Fetch response.
     */
    async sendStream<T>(
        url: string,
        stream: any | string,
        { type = "application/octet-stream", end, parseResponse = "stream" }: SendStreamOptions = {}
    ): Promise<T> {
        const headers: Headers = {
            "content-type": type,
            expect: "100-continue"
        };

        if (typeof end !== "undefined") {
            headers["x-end-stream"] = end ? "true" : "false";
        }

        return this.post<T>(url, stream, headers, { parse: parseResponse });
    }
}

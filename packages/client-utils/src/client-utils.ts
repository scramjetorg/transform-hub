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
        let resp = this.fetch(input, init);

        if (this.log) {
            const log = this.log;

            log.request(...arguments);

            resp = resp
                .then((res: any) => {
                    log.request(input, init, res);
                    return res;
                })
                .catch((err: any) => {
                    log.error(err);
                    throw err;
                });
        }

        const source = new Error();

        resp.catch((e: Error) => {
            throw ClientError.from(e, undefined, source);
        });

        if (options.parse === "json") {
            return resp.then((res: any) => res.json()) as Promise<T>;
        }

        if (options.parse === "text") {
            return resp.then((res: any) => res.text()) as Promise<T>;
        }

        if (options.parse === "stream") {
            return resp.then((res: any) => res.body) as Promise<T>;
        }

        throw new Error("Unknown parse option");
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

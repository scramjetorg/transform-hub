/* eslint-disable no-console */
import { fetch, QueryError, FetchResultTypes } from "@sapphire/fetch";
import { Stream } from "stream";

import { ClientError } from "./client-error";
import { Headers, HttpClient, RequestLogger, SendStreamOptions, PostRequestConfig } from "./types";

/**
 * Provides HTTP communication methods.
 */
export class ClientUtils implements HttpClient {
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
            ...logger,
        };
    }

    /**
     * Request wrapper.
     *
     * @param args Fetch arguments.
     * @returns Fetch object.
     */
    private safeRequest<T>(...args: Parameters<typeof fetch>) {
        let resp = fetch<T>(...args);

        if (this.log) {
            const log = this.log;

            log.request(...args);
            resp = resp
                .then((res) => {
                    log.ok(res);
                    return res;
                })
                .catch((err) => {
                    log.error(err);
                    throw err;
                });
        }

        const source = new Error();

        return resp.catch((e: Error | QueryError) => {
            throw ClientError.from(e, undefined, source);
        });
    }

    /**
     * Performs get request.
     *
     * @param {string} url Request URL.
     * @returns Fetch response.
     */
    async get<T>(url: string): Promise<T> {
        return this.safeRequest<any>(`${this.apiBase}/${url}`, {}, FetchResultTypes.JSON);
    }

    /**
     * Performs get request for streamed data.
     *
     * @param {string} url Request URL.
     * @returns Fetch response.
     */
    async getStream<T>(url: string): Promise<T> {
        return this.safeRequest<any>(`${this.apiBase}/${url}`, {}, FetchResultTypes.Result) as Promise<T>;
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
        config: PostRequestConfig = { json: false }
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
            config.parseResponse ? FetchResultTypes.JSON : FetchResultTypes.Result
        ) as Promise<T>;
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
            FetchResultTypes.JSON
        ) as Promise<T>;
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
        stream: string | Stream,
        { type = "application/octet-stream", end, parseResponse }: SendStreamOptions = {}
    ): Promise<T> {
        const headers: Headers = {
            "content-type": type,
            expect: "100-continue",
        };

        if (typeof end !== "undefined") {
            headers["x-end-stream"] = end ? "true" : "false";
        }

        return this.post<T>(url, stream, headers, { parseResponse });
    }
}

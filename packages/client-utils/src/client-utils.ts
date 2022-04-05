/* eslint-disable no-console */
import { ClientError, QueryError } from "./client-error";
import { Headers, HttpClient, RequestLogger, SendStreamOptions, RequestConfig } from "./types";
import { normalizeUrl } from "@scramjet/utility";

/**
 * Provides HTTP communication methods.
 */
export abstract class ClientUtilsBase implements HttpClient {
    private log?: RequestLogger;

    static headers: Headers = {};

    constructor(
        public apiBase: string,
        private fetch: any
    ) {
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

    static setDefaultHeaders(headers: Headers) {
        ClientUtilsBase.headers = headers;
    }

    /**
     * Wraps fetch request and handles response based on given config.
     *
     * @param {RequestInfo} input Request URL.
     * @param {RequestInit} init Request options.
     * @param {RequestConfig} options Request wrapper options.
     */
    private async safeRequest<T>(input: RequestInfo, init: RequestInit, options: RequestConfig = { parse: "stream" }) {
        const fetchInit: RequestInit = init;

        fetchInit.headers = { ...ClientUtilsBase.headers, ...fetchInit.headers };

        options.throwOnErrorHttpCode ??= true;

        try {
            const response = await this.fetch(input, fetchInit)
                .then((result: any) => {
                    if (!options.throwOnErrorHttpCode || result.ok) {
                        if (this.log) {
                            this.log.ok(result);
                        }

                        return result;
                    }

                    const fetchError = new QueryError(
                        input.toString(),
                        result.status,
                        result,
                        result.body
                    );

                    throw fetchError;
                }).catch((error: any) => {
                    if (this.log) {
                        this.log?.error(error);
                    }

                    if (error instanceof QueryError) {
                        throw error;
                    }

                    throw new QueryError(input.toString(), error.code);
                });

            if (options.parse === "json") {
                return response.json() as Promise<T>;
            }

            if (options.parse === "text") {
                return response.text() as Promise<T>;
            }

            if (options.parse === "stream") {
                return response.body as Promise<T>;
            }

            throw new ClientError("BAD_PARAMETERS", `Unknown parse option: ${options.parse}`);
        } catch (error: any) {
            throw ClientError.from(error);
        }
    }

    /**
     * Performs get using request wrapper.
     *
     * @param {string} url Request URL.
     * @returns {Promise<T>} Promise resolving to given type.
     */
    async get<T>(url: string): Promise<T> {
        return this.safeRequest<T>(normalizeUrl(`${this.apiBase}/${url}`), {}, { parse: "json" });
    }

    /**
     * Performs get request for streamed data.
     *
     * @param {string} url Request URL.
     * @returns {Readable} Readable stream.
     */
    async getStream(url: string) {
        return this.safeRequest<any>(normalizeUrl(`${this.apiBase}/${url}`), {});
    }

    /**
     * Performs POST request and returns response in given type.
     *
     * @param url Request URL.
     * @param data Data to be send.
     * @param headers Request headers.
     * @param config Request config.
     * @returns {Promise<T>} Promise resolving to given type.
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
            normalizeUrl(`${this.apiBase}/${url}`),
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
     * @returns {Promise<T>} Promise resolving to given type.
     */
    async delete<T>(url: string): Promise<T> {
        return this.safeRequest<T>(
            normalizeUrl(`${this.apiBase}/${url}`),
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
     * @param {Readable|string} stream stream to be send.
     * @param {SendStreamOptions} options send stream options.

     * @returns {Promise<T>} Promise resolving to response of given type.
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

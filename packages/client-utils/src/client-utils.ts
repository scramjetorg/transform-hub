import { Agent as HTTPAgent } from "http";
import { Agent as HTTPSAgent } from "https";
import { ClientError, QueryError } from "./client-error";
import { Headers, HttpClient, RequestLogger, SendStreamOptions, RequestConfig } from "./types";
import { Agent as HTTPAgent } from "http";
import { Agent as HTTPSAgent } from "https";

/**
 * Provides HTTP communication methods.
 */
export abstract class ClientUtilsBase implements HttpClient {
    private log?: RequestLogger;
    private normalizeUrlFn: (url: string) => string;

    static headers: Headers = {};
    public agent: HTTPAgent | HTTPSAgent = new HTTPAgent();

    public agent: HTTPAgent | HTTPSAgent = new HTTPAgent();

    constructor(
        public apiBase: string,
        private fetch: any,
        normalizeUrlFn?: (url: string) => string
    ) {
        this.normalizeUrlFn = normalizeUrlFn || ((url: string) => url);
    }

    /**
     * Sets given logger.
     *
     * @param {Partial<RequestLogger>} logger Logger to set.
     */
    public addLogger(logger: Partial<RequestLogger>) {
        this.log = {
            request: () => 0,
            end: () => 0,
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
        const AbortController = globalThis.AbortController || (await import("abort-controller")).AbortController;
        const abortController = new AbortController();

        const fetchInit: RequestInit & { agent?: HTTPAgent } = { signal: abortController.signal, ...init };

        fetchInit.headers = { ...ClientUtilsBase.headers, ...fetchInit.headers };
        fetchInit.agent ||= new HTTPAgent();

        options.throwOnErrorHttpCode ??= true;

        try {
            const response = await this.fetch(input, fetchInit)
                .then(async (result: any) => {
                    if (!options.throwOnErrorHttpCode || result.ok) {
                        if (this.log) {
                            this.log.ok(result);
                        }

                        return result;
                    }

                    const errorBodyJson = await result.text();

                    const fetchError = new QueryError(
                        input.toString(),
                        errorBodyJson.error?.code || result.status,
                        result.status,
                        errorBodyJson,
                        result,
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
                return response.json() as T;
            }

            if (options.parse === "text") {
                return response.text() as T;
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
     * @param {RequestInit} requestInit RequestInit object to be passed to fetch.
     * @returns {Promise<T>} Promise resolving to given type.
     */
    async get<T>(url: string, requestInit: RequestInit = {}): Promise<T> {
        return this.safeRequest<T>(this.normalizeUrlFn(`${this.apiBase}/${url}`), requestInit, { parse: "json" });
    }

    /**
     * Performs get request for streamed data.
     *
     * @param {string} url Request URL.
     * @param {RequestInit} requestInit RequestInit object to be passed to fetch.
     * @returns {Readable} Readable stream.
     */
    async getStream(url: string, requestInit: RequestInit = {}) {
        return this.safeRequest<any>(this.normalizeUrlFn(`${this.apiBase}/${url}`), requestInit);
    }

    /**
     * Performs POST request and returns response in given type.
     *
     * @param url Request URL.
     * @param data Data to be send.
     * @param {RequestInit} requestInit RequestInit object to be passed to fetch.
     * @param config Request config.
     * @returns {Promise<T>} Promise resolving to given type.
     */
    async post<T>(
        url: string,
        data: any,
        requestInit: RequestInit = {},
        config: RequestConfig = { parse: "stream", json: false }
    ): Promise<T> {
        if (config.json) {
            requestInit.headers ||= {} as Headers;
            (requestInit.headers as Headers)["Content-Type"] = "application/json";
            data = JSON.stringify(data);
        }

        return this.safeRequest<T>(
            this.normalizeUrlFn(`${this.apiBase}/${url}`),
            {
                ...requestInit,
                method: "post",
                body: data
            },
            config
        );
    }

    /**
     * Performs PUT request and returns response in given type.
     *
     * @param url Request URL.
     * @param data Data to be send.
     * @param {RequestInit} requestInit RequestInit object to be passed to fetch.
     * @param config Request config.
     * @returns {Promise<T>} Promise resolving to given type.
     */
    async put<T>(
        url: string,
        data: any,
        requestInit: RequestInit = {},
        config: RequestConfig = { parse: "stream", json: false }
    ): Promise<T> {
        if (config.json) {
            requestInit.headers ||= {} as Headers;
            (requestInit.headers as Headers)["Content-Type"] = "application/json";
            data = JSON.stringify(data);
        }

        return this.safeRequest<T>(
            this.normalizeUrlFn(`${this.apiBase}/${url}`),
            {
                ...requestInit,
                method: "put",
                body: data
            },
            config
        );
    }

    /**
     * Performs DELETE request.
     *
     * @param {string} url Request URL.
     * @param {RequestInit} requestInit RequestInit object to be passed to fetch.
     * @returns {Promise<T>} Promise resolving to given type.
     */
    async delete<T>(url: string, requestInit: RequestInit = {}): Promise<T> {
        requestInit.headers ||= {} as Headers;
        (requestInit.headers as Headers)["Content-Type"] = "application/json";

        return this.safeRequest<T>(
            this.normalizeUrlFn(`${this.apiBase}/${url}`),
            {
                ...requestInit,
                method: "delete"
            },
            { parse: "json" }
        );
    }

    /**
     * Performs POST request for streamed data.
     *
     * @param {string} url Request url.
     * @param {Readable|string} stream stream to be send.
     * @param {RequestInit} requestInit RequestInit object to be passed to fetch.
     * @param {SendStreamOptions} options send stream options.
     * @returns {Promise<T>} Promise resolving to response of given type.
     */
    async sendStream<T>(
        url: string,
        stream: any | string,
        requestInit: RequestInit = {},
        { type = "application/octet-stream", end, parseResponse = "stream", put = false }: SendStreamOptions = {}
    ): Promise<T> {
        requestInit.headers ||= {} as Headers;

        Object.assign(requestInit.headers, {
            "content-type": type,
            expect: "100-continue"
        });

        if (typeof end !== "undefined") {
            (requestInit.headers as Headers)["x-end-stream"] = end ? "true" : "false";
        }

        return this[put ? "put" : "post"]<T>(url, stream, requestInit, { parse: parseResponse });
    }
}

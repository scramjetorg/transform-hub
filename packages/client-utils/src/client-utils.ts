import { Agent as HTTPAgent } from "http";
import { Agent as HTTPSAgent } from "https";
import { ClientError, QueryError } from "./client-error";
import { Headers, HttpClient, HttpMethod, RequestLogger, SendStreamOptions, GetStreamOptions, RequestConfig } from "./types";

/**
 * Provides HTTP communication methods.
 */
export abstract class ClientUtilsBase implements HttpClient {
    private log?: RequestLogger;
    private normalizeUrlFn: (url: string) => string;

    static headers: Headers = {};
    public agent: HTTPAgent | HTTPSAgent = new HTTPAgent();
    private disposed = false;
    protected ownsAgent = true;

    constructor(
        public apiBase: string,
        private fetch: any,
        normalizeUrlFn?: (url: string) => string
    ) {
        this.normalizeUrlFn = normalizeUrlFn || ((url: string) => url);
    }

    /** Release keep-alive sockets owned by this client. Safe to call repeatedly. */
    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        if (!this.ownsAgent) return;
        if (this.fetch?.dispose) this.fetch.dispose();
        else (this.agent as any)?.destroy?.();
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
        fetchInit.agent ||= this.agent;

        options.throwOnErrorHttpCode ??= true;

        const requestStack = new Error();

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

            if (options.parse === "response") {
                return response as T;
            }

            throw new ClientError("BAD_PARAMETERS", `Unknown parse option: ${options.parse}`);
        } catch (error: any) {
            throw ClientError.from(error, error.message, requestStack);
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

    async request(
        method: HttpMethod,
        url: string,
        requestInit: RequestInit = {}
    ): Promise<Response> {
        return this.safeRequest<Response>(
            this.normalizeUrlFn(`${this.apiBase}/${url}`),
            {
                ...requestInit,
                method
            },
            { parse: "response", throwOnErrorHttpCode: false }
        );
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
        { type = "application/octet-stream", end, parseResponse = "stream" }: SendStreamOptions = {}
    ): Promise<T> {
        requestInit.headers ||= {} as Headers;
        (requestInit.headers as Headers)["content-type"] = type;

        if (typeof end !== "undefined") {
            (requestInit.headers as Headers)["x-end-stream"] = end ? "true" : "false";
        }

        let method: "post" | "put" = "post";

        if (requestInit.method === "put") method = "put";

        return this[method]<T>(url, stream, requestInit, { parse: parseResponse });
    }

    /**
     * Performs get request for streamed data.
     *
     * @param {string} url Request URL.
     * @param {RequestInit} requestInit RequestInit object to be passed to fetch.
     * @param {GetStreamOptions} options send stream options.
     * @returns {Readable} Readable stream.
     */
    async getStream(url: string, requestInit: RequestInit = {}, { type }: GetStreamOptions = { type: "application/octet-stream" }) {
        requestInit.headers ||= {} as Headers;

        Object.assign(requestInit.headers, {
            "content-type": type
        });

        return this.safeRequest<any>(this.normalizeUrlFn(`${this.apiBase}/${url}`), requestInit);
    }
}

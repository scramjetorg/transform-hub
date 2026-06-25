import { Readable } from "stream";
import { ClientError } from "../client-error";

/**
 * HTTP method literals.
 */
export type HttpMethod = "get" | "head" | "post" | "put" | "delete" | "connect" | "trace" | "patch";

/**
 * Request configuration for HTTP client methods.
 */
export type RequestConfig = {
    parse: "json" | "text" | "stream" | "response";
    json?: boolean;
    throwOnErrorHttpCode?: boolean;
}

/**
 * Options for sending sending stream.
 */
export type SendStreamOptions = Partial<{
    type: string;
    end: boolean;
    parseResponse?: "json" | "text" | "stream" | "response";
}>;

/**
 * Options for sending sending stream.
 */
export type GetStreamOptions = Partial<{
    type: string;
    encoding?: BufferEncoding;
}>;

/**
 * Request headers.
 */
export type Headers = Record<string, string>;

/**
 * Request logger.
 */
export type RequestLogger = {
    request: (...req: any) => void;
    end: (...req: any) => void;
    ok: (res: any) => void;
    error: (res: ClientError) => void;
};

/**
 * Environmentally independent HttpClient interface.
 */
export interface HttpClient {
    addLogger(logger: Partial<RequestLogger>): void;
    get<T>(url: string, requestInit?: RequestInit): Promise<T>;
    getStream(url: string, requestInit?: RequestInit): Promise<any>;
    post<T>(url: string, data: any, requestInit?: RequestInit, options?: { json: boolean } & RequestConfig): Promise<T>;
    put<T>(url: string, data: any, requestInit?: RequestInit, options?: { json: boolean } & RequestConfig): Promise<T>;
    delete<T>(url: string, requestInit?: RequestInit): Promise<T>;
    request(method: HttpMethod, url: string, requestInit?: RequestInit, options?: RequestConfig): Promise<Response>;
    sendStream<T>(url: string, stream: any, requestInit?: RequestInit, options?: SendStreamOptions): Promise<T>;
}

/**
 * Nodejs HttpClient interface.
 */
export interface HttpClientNode extends HttpClient {
    getStream(url: string, requestInit?: RequestInit): Promise<Readable>;
    sendStream<T>(
        url: string,
        stream: Readable | string,
        requestInit?: RequestInit,
        options?: SendStreamOptions
    ): Promise<T>;
}

/**
 * Browser HttpClient interface.
 */
export interface HttpClientBrowser extends HttpClient {
    getStream(url: string, requestInit?: RequestInit): Promise<Response["body"]>;
    sendStream<T>(
        url: string,
        stream: ReadableStream<any> | string,
        requestInit?: RequestInit,
        options?: SendStreamOptions
    ): Promise<T>;
}

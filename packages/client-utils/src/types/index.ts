import { Readable } from "stream";
import { ClientError } from "../client-error";

/**
 * Options for sending sending stream.
 */
export type SendStreamOptions = Partial<{
    type: string;
    end: boolean;
    parseResponse?: "json" | "text" | "stream";
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
    ok: (res: any) => void;
    error: (res: ClientError) => void;
};

/**
 * Request configuration.
 */
export type RequestConfig = {
    /**
     * How to parse response.
     */
    parse: "json" | "text" | "stream"

    /**
     * Defines if payload should be stringified.
     */
    json?: boolean;

    throwOnErrorHttpCode?: boolean
};

/**
 * Environmentally independent HttpClient interface.
 */
export interface HttpClient {
    addLogger(logger: RequestLogger): void;
    get<T>(url: string): Promise<T>;
    getStream(url: string): Promise<any>;
    post<T>(url: string, data: any, headers?: Headers, options?: { json: boolean } & RequestConfig): Promise<T>;
    delete<T>(url: string): Promise<T>;
    sendStream<T>(url: string, stream: any, options?: SendStreamOptions): Promise<T>;
}

/**
 * Nodejs HttpClient interface.
 */
export interface HttpClientNode extends HttpClient {
    getStream(url: string): Promise<Readable>;
    sendStream<T>(url: string, stream: Readable | string, options?: SendStreamOptions): Promise<T>;
}

/**
 * Browser HttpClient interface.
 */
export interface HttpClientBrowser extends HttpClient {
    getStream(url: string): Promise<Response["body"]>;
    sendStream<T>(url: string, stream: ReadableStream<any> | string, options?: SendStreamOptions): Promise<T>;
}

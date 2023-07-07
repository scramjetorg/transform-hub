/// <reference lib="dom" />

import { Agent as HTTPAgent } from "http";
import { Agent as HTTPSAgent } from "https";
import { Readable } from "stream";

export declare class QueryError extends Error {
    readonly url: string;
    readonly status?: string;
    readonly code?: string;
    readonly body?: any;
    readonly response?: Response;
    constructor(url: string, code: string, status?: string, body?: string, response?: Response);
}

export declare type ClientErrorCode = "GENERAL_ERROR" | "BAD_PARAMETERS" | "NEED_AUTHENTICATION" | "NOT_AUTHORIZED" | "NOT_FOUND" | "GONE" | "SERVER_ERROR" | "REQUEST_ERROR" | "UNKNOWN_ERROR" | "CANNOT_CONNECT" | "INVALID_RESPONSE" | "INSUFFICIENT_RESOURCES" | "UNPROCESSABLE_ENTITY";

export declare class ClientError extends Error {
    reason?: Error;
    source?: Error;
    code: string;
    status?: string;
    message: any;
    body: any;
    constructor(code: ClientErrorCode, reason?: Error | string, message?: string, source?: Error, status?: string);
    from(error: Error | QueryError, message?: string, source?: Error): ClientError;
    toJSON(): Promise<unknown>;
}

export declare type SendStreamOptions = Partial<{
    type: string;
    end: boolean;
    parseResponse?: "json" | "text" | "stream";
    put: boolean;
}>

export type IHeaders = Record<string, string>;
export declare class RequestLogger {
    request: (...req: any) => void;
    end: (...req: any) => void;
    ok: (res: any) => void;
    error: (res: ClientError) => void;
}

export declare type RequestConfig = {
    parse: "json" | "text" | "stream";
    json?: boolean;
    throwOnErrorHttpCode?: boolean;
}

export declare class HttpClient {
    addLogger(logger: RequestLogger): void;
    get<T>(url: string, requestInit?: RequestInit): Promise<T>;
    getStream(url: string, requestInit?: RequestInit): Promise<Readable>;
    post<T>(url: string, data: any, requestInit?: RequestInit, options?: {
        json: boolean;
    } & RequestConfig): Promise<T>;
    delete<T>(url: string, requestInit?: RequestInit): Promise<T>;
    sendStream<T>(url: string, stream: any, requestInit?: RequestInit, options?: SendStreamOptions): Promise<T>;
}

export declare class ClientUtilsBase extends HttpClient {
    static headers: Headers;
    static setDefaultHeaders(headers: Headers): void;

    apiBase: string;
    agent: HTTPAgent | HTTPSAgent;

    constructor(apiBase: string, fetch: any, normalizeUrlFn?: (url: string) => string);

    addLogger(logger: Partial<RequestLogger>): void;
    get<T>(url: string, requestInit: RequestInit): Promise<T>;
    getStream(url: string, requestInit?: RequestInit): Promise<any>;
    post<T>(url: string, data: any, requestInit?: RequestInit, config?: RequestConfig): Promise<T>;
    put<T>(url: string, data: any, requestInit?: RequestInit, config?: RequestConfig): Promise<T>;
    delete<T>(url: string, requestInit?: RequestInit): Promise<T>;
    sendStream<T>(url: string, stream: any | string, requestInit?: RequestInit, opts?: SendStreamOptions): Promise<T>;
}

export declare class ClientUtils extends ClientUtilsBase {
    constructor(apiBase: string, ca?: string | Buffer);
}

export declare class ClientUtilsCustomAgent extends ClientUtilsBase {
    constructor(apiBase: string, agent: HTTPAgent)
}

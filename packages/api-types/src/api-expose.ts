/**
 * API-exposed HTTP route/server type contracts.
 *
 * Replaces the previous stub with full structural types migrated from
 * @scramjet/types/api-expose.ts, adapted to depend only on @scramjet/runtime-types
 * and Node built-ins.
 */

import { IncomingHttpHeaders, IncomingMessage, Server, ServerResponse } from "http";
import { DataStream } from "scramjet";
import { Duplex, Readable, Writable } from "stream";
import { MaybePromise } from "@scramjet/runtime-types";
import { ControlMessageCode, MonitoringMessageCode } from "./message-types";
import { ListenOptions } from "net";

// ---------------------------------------------------------------------------
// Parsed HTTP message
// ---------------------------------------------------------------------------

export type ParsedMessage = IncomingMessage & {
    body?: any;
    params?: { [key: string]: any },
    query?: { [key: string]: any };
    writeContinue: ServerResponse["writeContinue"];
};

// ---------------------------------------------------------------------------
// HTTP method literals
// ---------------------------------------------------------------------------

export type HttpMethod = "get" | "head" | "post" | "put" | "delete" | "connect" | "trace" | "patch";

// ---------------------------------------------------------------------------
// Stream endpoint types
// ---------------------------------------------------------------------------

export type StreamInput =
    | ((req: ParsedMessage, res: ServerResponse) => MaybePromise<Readable>)
    | MaybePromise<Readable>;

export type StreamOutput = (
    (req: ParsedMessage, res: ServerResponse) => MaybePromise<any>
) | MaybePromise<Writable>;

/**
 * Configuration options for streaming endpoints
 */
export type StreamConfig = {
    json?: boolean;
    text?: boolean;
    end?: boolean;
    encoding?: BufferEncoding;
    checkContentType?: boolean;
    checkEndHeader?: boolean;
    method?: "post" | "put";
    postponeContinue?: boolean;
};

// ---------------------------------------------------------------------------
// Resolver and middleware types
// ---------------------------------------------------------------------------

export type GetResolver = (req: ParsedMessage) => MaybePromise<any>;
export type OpResolver = (req: ParsedMessage, res?: ServerResponse) => MaybePromise<any>;
export type OpOptions = { rawBody?: boolean };

export type NextCallback = (err?: Error) => void;
export type Middleware = (req: ParsedMessage, res: ServerResponse, next: NextCallback) => void;
export type Decorator = (req: IncomingMessage) => MaybePromise<void>;

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export interface APIError extends Error {
    code: number;
    httpMessage: string;
    cause?: Error;
}

// ---------------------------------------------------------------------------
// Forwarding and duplex types
// ---------------------------------------------------------------------------

export type ForwardStrategy = (req: IncomingMessage, urls: string[]) => MaybePromise<[string, string]>;

export type IDuplexStream = Duplex & {
    input: Readable;
    output: Writable;
};

// ---------------------------------------------------------------------------
// Listen arguments
// ---------------------------------------------------------------------------

export type ListenArgs =
    [ number, string?, number? ] |
    [ number, number ] |
    [ string, number? ] |
    [ ListenOptions ] |
    [ any, number? ] |
    []
;

// ---------------------------------------------------------------------------
// Base API interface
// ---------------------------------------------------------------------------

export interface APIBase {
    op(
        method: HttpMethod,
        path: string | RegExp,
        message: OpResolver | ControlMessageCode,
        comm?: unknown,
        rawBody?: boolean
    ): void;

    get(path: string | RegExp, msg: GetResolver | MonitoringMessageCode, conn?: unknown): void;

    upstream(path: string | RegExp, stream: StreamInput, config?: StreamConfig): void;
    downstream(path: string | RegExp, stream: StreamOutput, config?: StreamConfig): void;
    duplex(path: string | RegExp, callback: (stream: IDuplexStream, headers: IncomingHttpHeaders) => void): void;
    forward(path: string, urls: string[], strategy?: ForwardStrategy): void;
    use(path: string | RegExp, ...middlewares: Middleware[]): void;
}

// ---------------------------------------------------------------------------
// APIExpose — full HTTP server interface
// ---------------------------------------------------------------------------

export interface APIExpose extends APIBase {
    server: Server;
    log: DataStream;

    create(path: string | RegExp, handler: Middleware): void;
    delete(path: string | RegExp, handler: Middleware): void;
    update(path: string | RegExp, handler: Middleware): void;
    read(path: string | RegExp, handler: Middleware): void;
    all(path: string | RegExp, handler: Middleware): void;
    head(path: string | RegExp, handler: Middleware): void;
    patch(path: string | RegExp, handler: Middleware): void;
    options(path: string | RegExp, handler: Middleware): void;
    connect(path: string | RegExp, handler: Middleware): void;
    trace(path: string | RegExp, handler: Middleware): void;

    decorate(path: string | RegExp, ...decorators: Decorator[]): void;
}

// ---------------------------------------------------------------------------
// APIRoute — route-only surface (no server)
// ---------------------------------------------------------------------------

export interface APIRoute extends APIBase {
    lookup: Middleware;
}

// ---------------------------------------------------------------------------
// APIServer — full server with listen
// ---------------------------------------------------------------------------

export interface APIServer extends APIExpose {
    listen: (...args: ListenArgs) => Promise<void>;
}

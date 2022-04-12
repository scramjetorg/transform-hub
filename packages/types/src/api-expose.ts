import { IncomingHttpHeaders, IncomingMessage, Server, ServerResponse } from "http";
import { DataStream } from "scramjet";
import { Duplex, Readable, Writable } from "stream";
import { ICommunicationHandler } from "./communication-handler";
import { ControlMessageCode, MonitoringMessageCode } from "./message-streams";
import { MaybePromise } from "./utils";

export type ParsedMessage = IncomingMessage & { body?: any, params: { [key: string]: any } | undefined };
export type HttpMethod = "get" | "head" | "post" | "put" | "delete" | "connect" | "trace" | "patch";

export type StreamInput =
    ((req: ParsedMessage, res: ServerResponse) => MaybePromise<Readable>) | MaybePromise<Readable>;
export type StreamOutput =
    ((req: ParsedMessage, res: ServerResponse) => MaybePromise<any>) | MaybePromise<Writable>;
export type GetResolver = (req: ParsedMessage) => MaybePromise<any>;
export type OpResolver = (req: ParsedMessage, res?: ServerResponse) => MaybePromise<any>;

export type NextCallback = (err?: Error) => void;
export type Middleware = (req: ParsedMessage, res: ServerResponse, next: NextCallback) => void;
export type Decorator = (req: IncomingMessage) => void;

/**
 * Configuration options for streaming endpoints
 */
export type StreamConfig = {
    /**
     * Is the stream a JSON stream?
     */
    json?: boolean;
    /**
     * Is the stream a text stream?
     */
    text?: boolean;
    /**
     * Should request end also end the stream or can the endpoint accept subsequent connections
     */
    end?: boolean;
    /**
     * Encoding used in the stream
     */
    encoding?: BufferEncoding;

    /**
     * Perform stream content-type type checks
     */
    checkContentType?: boolean;

    /**
     * Should consider x-end-stream header or just use the 'end'
     *  @default true
     */
    checkEndHeader?: boolean;
};

export interface APIError extends Error {
    /**
     * Http status code to be outputted
     */
    code: number;
    /**
     * The message that will be sent in reason line
     */
    httpMessage: string;
    /**
     *
     */
    cause?: Error;
}

export interface APIBase {
    /**
     * Simple POST/DELETE request hook.
     * This method can be used in two ways - as a control message handler or as general data handler.
     *
     * @example
     * // Control message handler
     * router.op("post", "/_kill", RunnerMessageCode.KILL, this.communicationHandler);
     * // Data handler
     * router.op("post", `${this.apiBase}/start`, (req) => this.handleStartRequest(req));
     *
     * @param path the request path as string or regex
     * @param message which operation to expose
     * @param conn the communication handler to use
     */
    op<T extends ControlMessageCode>(
        method: HttpMethod, path: string | RegExp, message: OpResolver | T, conn?: ICommunicationHandler): void;

    /**
     * Simple GET request hook for static data in monitoring stream.
     *
     * @param path the request path as string or regex
     * @param op which operation
     * @param conn the communication handler to use
     */
    get<T extends MonitoringMessageCode>(
        path: string | RegExp, msg: T, conn: ICommunicationHandler): void;

    /**
     * Alternative GET request hook with dynamic resolution
     *
     * @param path the request path as string or regex
     * @param op which operation
     */
    get(path: string | RegExp, msg: GetResolver): void;

    /**
     * A method that allows to pass a stream to the specified path on the API server
     *
     * @param path the request path as string or regex
     * @param stream the stream that will be sent in reposnse body or a method to be called then
     * @param config configuration of the stream
     */
    upstream(
        path: string | RegExp,
        stream: StreamInput,
        config?: StreamConfig
    ): void;

    /**
     * A method that allows to consume incoming stream from the specified path on the API server
     *
     * @param path the request path as string or regex
     * @param stream the output that will be piped to from request or a method to be called then
     * @param config configuration of the stream
     */
    downstream(
        path: string | RegExp,
        stream: StreamOutput,
        config?: StreamConfig
    ): void;

    /**
     * Allows to handle dual direction (duplex) streams.
     *
     * @param path the request path as string or regex
     * @param callback A method to be called when the stream is ready.
     */
    duplex(
        path: string | RegExp,
        callback: (stream: Duplex, headers: IncomingHttpHeaders) => void
    ): void;

    /**
     * Allows to register middlewares for specific paths, for all HTTP methods.
     *
     * @param {string|RegExp} path
     * @param {Middleware[]} middlewares
     */
    use(path: string | RegExp, ...middlewares: Middleware[]): void;
}

export interface APIExpose extends APIBase {
    /**
     * The raw HTTP server
     */
    server: Server
    log: DataStream
    decorate(path: string | RegExp, ...decorators: Decorator[]): void
}

export interface APIRoute extends APIBase {
    lookup: Middleware;
}

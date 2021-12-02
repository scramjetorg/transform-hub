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
    ((req: IncomingMessage, res: ServerResponse) => MaybePromise<any>) | MaybePromise<Writable>;
export type GetResolver = (req: ParsedMessage) => MaybePromise<any>;
export type OpResolver = (req: ParsedMessage, res?: ServerResponse) => MaybePromise<any>;

export type NextCallback = (err?: Error) => void;
export type Middleware = (req: IncomingMessage, res: ServerResponse, next: NextCallback) => void;

/**
 * Configuration options for streaming endpoionts
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
    // /**
    //  * The Trouter
    //  */
    // router: Trouter
    /**
     * Simple POST request hook for static data in monitoring stream.
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
     * @param stream the stream that will be sent in reponse body or a method to be called then
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

    duplex(
        path: string | RegExp,
        callback: (stream: Duplex, headers: IncomingHttpHeaders) => void
    ): void;

    use(path: string | RegExp, ...middlewares: Middleware[]): void;
}

export interface APIExpose extends APIBase {
    /**
     * The raw HTTP server
     */
    server: Server
    log: DataStream
}

export interface APIRoute extends APIBase {
    lookup: Middleware;
}

import { IncomingMessage } from "http";
import { Server } from "http";
import { Readable, Writable } from "stream";
import { CommunicationHandler } from "@scramjet/model";
import { ControlMessageCode, MonitoringMessageCode } from "./message-streams";
import { MaybePromise } from "./utils";

export type StreamInput = ((req: IncomingMessage) => MaybePromise<Readable>) | MaybePromise<Readable>;
export type StreamOutput = ((req: IncomingMessage) => MaybePromise<void>) | MaybePromise<Writable>;

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

export interface APIExpose {
    /**
     * The raw HTTP server
     */
    server: Server
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
    op<T extends ControlMessageCode>(path: string|RegExp, message: T, conn: CommunicationHandler): void;
    /**
     * Simple GET request hook for static data in monitoring stream.
     *
     * @param path the request path as string or regex
     * @param op which operation
     * @param conn the communication handler to use
     */
    get<T extends MonitoringMessageCode>(path: string|RegExp, op: T, conn: CommunicationHandler): void;
    /**
     * A method that allows to pass a stream to the specified path on the API server
     *
     * @param path the request path as string or regex
     * @param stream the stream that will be sent in reponse body or a method to be called then
     * @param config configuration of the stream
     */
    upstream(
        path: string|RegExp,
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
        path: string|RegExp,
        stream: StreamOutput,
        config?: StreamConfig
    ): void;
}

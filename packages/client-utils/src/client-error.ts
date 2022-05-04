/// <reference lib="dom" />

/**
 * The QueryError class which is thrown by the `fetch` method
 */
export class QueryError extends Error {
    /** The requested url. */
    public readonly url: string;

    /** The HTTP status code. */
    public readonly status?: string;

    /** The Error reference code. */
    public readonly code?: string;

    /** The Error instance returned by the API. */
    public readonly body?: any;

    /** The original {@link Response} object */
    public readonly response?: Response;

    public constructor(url: string, code: string, status?: string, body?: string, response?: Response) {
        super(`Failed to request '${url}' with code ${code}.`);
        this.url = url;
        this.code = code;
        this.status = status;
        this.body = body;
        this.response = response;
    }
}

export type ClientErrorCode =
    | "GENERAL_ERROR"
    | "BAD_PARAMETERS"
    | "NEED_AUTHENTICATION"
    | "NOT_AUTHORIZED"
    | "NOT_FOUND"
    | "GONE"
    | "SERVER_ERROR"
    | "REQUEST_ERROR"
    | "UNKNOWN_ERROR"
    | "CANNOT_CONNECT"
    | "INVALID_RESPONSE"
    | "INSUFFICIENT_RESOURCES"
    | "UNPROCESSABLE_ENTITY";

export class ClientError extends Error {
    reason?: Error;
    source?: Error;
    code: string;
    status?: string;
    message: any;
    body: any;

    constructor(code: ClientErrorCode, reason?: Error | string, message?: string, source?: Error, status?: string) {
        super(message || (reason instanceof Error ? reason.message : reason));

        this.code = code;
        this.status = status;
        if (reason instanceof Error) this.reason = reason;
        if (source instanceof Error) this.source = source;
        if (reason instanceof QueryError) this.message = reason.message;
        if (reason instanceof QueryError) this.body = reason.body;
    }

    // eslint-disable-next-line complexity
    static from(error: Error | QueryError, message?: string, source?: Error): ClientError {
        if (error instanceof QueryError) {
            if (error.status) {
                const status = error.status.toString();

                if (status === "400") return new this("BAD_PARAMETERS", error, message, source, status);
                if (status === "401") return new this("NEED_AUTHENTICATION", error, message, source, status);
                if (status === "403") return new this("NOT_AUTHORIZED", error, message, source, status);
                if (status === "404") return new this("NOT_FOUND", error, message, source, status);
                if (status === "410") return new this("GONE", error, message, source, status);
                if (status === "419") return new this("INSUFFICIENT_RESOURCES", error, message, source, status);
                if (status === "422") return new this("UNPROCESSABLE_ENTITY", error, message, source, status);
                if (status === "ECONNREFUSED") return new this("CANNOT_CONNECT", error, message, source, status);
                if (+error.status >= 500) return new this("SERVER_ERROR", error, message, source, status);
                if (+error.status >= 400) return new this("REQUEST_ERROR", error, message, source, status);
                return new this("UNKNOWN_ERROR", error, `Response code is "${error.code}"`, source, status);
            }
            return new this("CANNOT_CONNECT", error);
        }
        return new this("GENERAL_ERROR", error);
    }

    async toJSON() {
        return new Promise((res, rej) => {
            try {
                // TODO: create  a JSON Error based on body (which can be a stream) and other ClientError properties.
                if (this.body) {
                    res(typeof this.body === "string" ? JSON.parse(this.body) : this.body);
                } else {
                    rej();
                }
            } catch (error) {
                rej(error);
            }
        });
    }
}

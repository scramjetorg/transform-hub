/// <reference lib="dom" />

/**
 * The QueryError class which is thrown by the `fetch` method
 */
export class QueryError extends Error {
    /** The requested url. */
    public readonly url: string;

    /** The HTTP status code. */
    public readonly code: string;

    /** The returned response body as a string */
    public readonly body?: string;

    /** The original {@link Response} object */
    public readonly response?: Response;

    public constructor(url: string, code: string, response?: Response, body?: string) {
        super(`Failed to request '${url}' with code ${code}.`);
        this.url = url;
        this.code = code;
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
    | "INSUFFICIENT_RESOURCES";

export class ClientError extends Error {
    reason?: Error;
    source?: Error;
    code: string;
    status?: string;
    body: any;

    constructor(code: ClientErrorCode, reason?: Error | string, message?: string, source?: Error) {
        super(message || (reason instanceof Error ? reason.message : reason));

        this.code = code;

        if (reason instanceof Error) this.reason = reason;
        if (source instanceof Error) this.source = source;
        if (reason instanceof QueryError) this.body = reason.body;
        if (reason instanceof QueryError) this.status = reason.code;
    }

    // eslint-disable-next-line complexity
    static from(error: Error | QueryError, message?: string, source?: Error): ClientError {
        if (error instanceof QueryError) {
            if (error.code) {
                const code = error.code.toString();

                if (code === "400") return new this("BAD_PARAMETERS", error, message, source);
                if (code === "401") return new this("NEED_AUTHENTICATION", error, message, source);
                if (code === "403") return new this("NOT_AUTHORIZED", error, message, source);
                if (code === "404") return new this("NOT_FOUND", error, message, source);
                if (code === "410") return new this("GONE", error, message, source);
                if (code === "507") return new this("INSUFFICIENT_RESOURCES", error, message, source);
                if (code === "ECONNREFUSED") return new this("CANNOT_CONNECT", error, message, source);
                if (+error.code >= 500) return new this("SERVER_ERROR", error, message, source);
                if (+error.code >= 400) return new this("REQUEST_ERROR", error, message, source);
                return new this("UNKNOWN_ERROR", error, `Response code is "${error.code}"`, source);
            }
            return new this("CANNOT_CONNECT", error);
        }
        return new this("GENERAL_ERROR", error);
    }

    async toJSON() {
        return new Promise((res, rej) => {
            try {
                if (this.body) {
                    res(JSON.parse(this.body));
                } else {
                    rej();
                }
            } catch (error) {
                rej(error);
            }
        });
    }
}

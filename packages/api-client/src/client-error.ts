import { QueryError } from "@sapphire/fetch";

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
    reason?: QueryError;
    source?: Error;
    code: string;

    constructor(code: ClientErrorCode, reason?: Error | string, message?: string, source?: Error) {
        super(message || (reason instanceof Error ? reason.message : reason));

        this.code = code;
        if (reason instanceof Error) this.reason = reason as QueryError;
        if (source instanceof Error) this.source = source;
    }

    // eslint-disable-next-line complexity
    static from(error: Error | QueryError, message?: string, source?: Error): ClientError {
        if (error instanceof ClientError) {
            return error;
        } else if (error instanceof QueryError) {
            // eslint-disable-next-line no-console
            console.error(error);

            if (error.code) {
                if (error.code === 400) return new this("BAD_PARAMETERS", error, message, source);
                if (error.code === 401) return new this("NEED_AUTHENTICATION", error, message, source);
                if (error.code === 403) return new this("NOT_AUTHORIZED", error, message, source);
                if (error.code === 404) return new this("NOT_FOUND", error, message, source);
                if (error.code === 410) return new this("GONE", error, message, source);
                if (error.code === 507) return new this("INSUFFICIENT_RESOURCES", error, message, source);
                //if (error.code === "ECONNREFUSED") return new this("CANNOT_CONNECT", error, message, source);
                if (+error.code >= 500) return new this("SERVER_ERROR", error, message, source);
                if (+error.code >= 400) return new this("REQUEST_ERROR", error, message, source);
                return new this("UNKNOWN_ERROR", error, `Response code is "${error.code}"`, source);
            }
            return new this("CANNOT_CONNECT", error);
        }
        return new this("GENERAL_ERROR", error);
    }
}

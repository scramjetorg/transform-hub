import { AxiosError } from "axios";

export type ClientErrorCode =
    "GENERAL_ERROR" |
    "BAD_PARAMETERS" |
    "NEED_AUTHENTICATION" |
    "NOT_AUTHORIZED" |
    "NOT_FOUND" |
    "GONE" |
    "SERVER_ERROR" |
    "REQUEST_ERROR" |
    "UNKNOWN_ERROR" |
    "CANNOT_CONNECT" |
    "INVALID_RESPONSE"
    ;

export class ClientError extends Error {
    reason?: AxiosError;
    code: string;

    constructor(code: ClientErrorCode, reason?: Error | string, message?: string) {
        super(message || (reason instanceof Error ? reason.message : reason));

        this.code = code;
        if (reason instanceof Error) {
            this.reason = reason as AxiosError;
        }
    }

    // eslint-disable-next-line complexity
    static from(error: Error | AxiosError, message?: string): ClientError {
        if (error instanceof ClientError) {
            return error;
        } else if ("isAxiosError" in error && error.isAxiosError) {
            if (error.code) {
                if (error.code === "400") return new this("BAD_PARAMETERS", error, message);
                if (error.code === "401") return new this("NEED_AUTHENTICATION", error, message);
                if (error.code === "403") return new this("NOT_AUTHORIZED", error, message);
                if (error.code === "404") return new this("NOT_FOUND", error, message);
                if (error.code === "410") return new this("GONE", error, message);
                if (+error.code >= 500) return new this("SERVER_ERROR", error, message);
                if (+error.code >= 400) return new this("REQUEST_ERROR", error, message);
                return new this("UNKNOWN_ERROR", error, `Response code is "${error.code}"`);
            }
            return new this("CANNOT_CONNECT", error);
        }
        return new this("GENERAL_ERROR", error);
    }
}

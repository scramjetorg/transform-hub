import { APIError, Middleware, NextCallback } from "@scramjet/types";
import { Server, IncomingMessage, ServerResponse } from "http";
import TRouter from "trouter";

export type CeroMiddleware = Middleware;
export type CeroDefaultRoute = Middleware;

export interface CeroRouter extends TRouter<CeroMiddleware> {
    use(path: string|RegExp, ...middlewares: CeroMiddleware[]): this;
    lookup(req: IncomingMessage, res: ServerResponse, next: NextCallback): void;
}

export interface SequentialCeroRouter extends CeroRouter {}

export type CeroConfig<
    T extends Server = Server,
    S extends CeroRouter = CeroRouter
> = Partial<{
    prioRequestsProcessing: boolean;
    router: S;
    server: T;
}>;

const codelist = {
    ERR_NOT_FOUND: [404, "Not found"],
    ERR_NOT_CURRENTLY_AVAILABLE: [412, "Not currently available"],
    ERR_FAILED_FETCH_DATA: [500, "Failed to fetch data"],
    ERR_FAILED_TO_SERIALIZE: [500, "Failed to serialize data"],
    ERR_INTERNAL_ERROR: [500, "Internal error occurred"],
    ERR_INVALID_CONTENT_TYPE: [400, "Invalid content-type"],
    ERR_CANNOT_PARSE_CONTENT: [400, "Could not parse content"],
    ERR_UNSUPPORTED_ENCODING: [400, "Invalid encoding in content-type"]
};

export type CeroCode = keyof typeof codelist;

export class CeroError extends Error implements APIError {
    code: number;
    httpMessage: string;
    cause?: Error;
    type: CeroCode;
    private _oldStack: typeof Error.prototype.stack;

    constructor(errCode: CeroCode, cause?: Error, extraMessage?: string) {
        const [code, defaultMessage] = codelist[errCode] as [number, string];

        super(`${code}: ${defaultMessage}`);

        this.httpMessage = extraMessage || defaultMessage;
        this.code = code;
        this.type = errCode;

        this._oldStack = this.stack;

        if (cause instanceof CeroError) return cause;
        if (cause) this.cause = cause;
    }

    get stack() {
        return `${this.cause ? this.cause.stack : this._oldStack}`;
    }
}

export type CeroErrorHandler = (err: CeroError, req: IncomingMessage, res: ServerResponse) => void;

export type CeroRouterConfig = Partial<{
    defaultRoute: CeroDefaultRoute;
    errorHandler: CeroErrorHandler;
    cacheSize: number;
    id: string;
}>;

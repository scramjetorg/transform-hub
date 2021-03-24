import { Server, IncomingMessage, ServerResponse } from "http";
import * as Trouter from "trouter";

const _cero = require("0http");

export type NextCallback = (e: Error) => void;
export type CeroMiddleware = (req: IncomingMessage, res: ServerResponse, next: NextCallback) => void;
export type CeroDefaultRoute = (req: IncomingMessage, res: ServerResponse, next: NextCallback) => void;

export interface CeroRouter extends Trouter<CeroMiddleware> {
    use(path: string|RegExp, ...middlewares: CeroMiddleware[]): this;
    lookup(req: IncomingMessage, res: ServerResponse): void;
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
    ERR_FAILED_FETCH_DATA: [500, "Failed to fetch data"],
    ERR_FAILED_TO_SERIALIZE: [500, "Failed to serialize data"],
    ERR_UNKNOWN_CONTENT_TYPE_REQUESTED: [400, "Unknown content-type"]
};

export type CeroCode = keyof typeof codelist;

export class CeroError extends Error {
    code: number;
    httpMessage: string;
    cause?: Error;

    constructor(errCode: CeroCode, cause?: Error) {

        const [code, message] = codelist[errCode] as [number, string];

        super(`${code}: ${message}`);

        this.httpMessage = message;
        this.code = code;

        if (cause instanceof CeroError) return cause;
        if (cause) this.cause = cause;
    }

    get stack() {
        return `${this.cause ? this.cause.stack : super.stack}`;
    }
}
export type CeroErrorHandler = (err: CeroError, req: IncomingMessage, res: ServerResponse) => void;

export type CeroRouterConfig = Partial<{
    defaultRoute: CeroDefaultRoute;
    errorHandler: CeroErrorHandler;
    cacheSize: number;
    id: string;
}>;
export const sequentialRouter: (config: CeroRouterConfig) => SequentialCeroRouter = require("0http/lib/router/sequential");

export const cero = <
    T extends Server = Server,
    S extends CeroRouter = CeroRouter
>(config: CeroConfig<T, S>) => {
    return _cero(config) as {
        router: S;
        server: T;
    };
};


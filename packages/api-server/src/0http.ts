import { Server, IncomingMessage, ServerResponse } from "http";
const _cero = require("0http");

export type NextCallback = () => void;
export type CeroMiddleware = (req: IncomingMessage, res: ServerResponse, next: NextCallback) => void;

export interface CeroRouter {
    use(path: string, ...middlewares: CeroMiddleware[]): void;
    lookup(req: IncomingMessage, res: ServerResponse): void;
}

export type CeroConfig<T extends Server = Server> = Partial<{
    prioRequestsProcessing: boolean;
    router: CeroRouter;
    server: T;
}>;

export const cero = <T extends Server = Server>(config: CeroConfig<T>) => {
    return _cero(config) as {
        router: CeroRouter;
        server: T;
    };
};


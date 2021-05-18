import { APIExpose, APIRoute } from "@scramjet/types";
import { Server } from "http";
import { createGetterHandler } from "./handlers/get";
import { createOperationHandler } from "./handlers/op";
import { createStreamHandlers } from "./handlers/stream";
import { cero, sequentialRouter } from "./lib/0http";
import { CeroRouter, CeroRouterConfig } from "./lib/definitions";

type ServerConfig = {
    verbose?: boolean;
    server?: Server;
    router?: CeroRouter;
};

export function getRouter(): APIRoute {
    const router = sequentialRouter({});
    const get = createGetterHandler(router);
    const op = createOperationHandler(router);
    const { upstream, downstream } = createStreamHandlers(router);

    return {
        lookup: (...args) => router.lookup(...args),
        get,
        op,
        upstream,
        downstream
    };
}

export function createServer(conf: ServerConfig = {}): APIExpose {
    const config: CeroRouterConfig = {
        defaultRoute: (req, res) => {
            res.writeHead(404);
            res.end();
        },
        errorHandler: (err, _req, res) => {
            res.writeHead(err.code, err.httpMessage);
            if (conf.verbose) res.end(err.stack);
            else res.end();
        }
    };
    const { server: srv, router } = cero({ server: conf.server, router: sequentialRouter(config) });
    const get = createGetterHandler(router);
    const op = createOperationHandler(router);
    const { upstream, downstream } = createStreamHandlers(router);

    return {
        server: srv,
        get,
        op,
        upstream,
        downstream,
        use: (path, ...middlewares) => {
            router.use(path, ...middlewares);
        }
    };
}

export * from "./lib/definitions";

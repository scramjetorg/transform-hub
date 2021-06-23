import { APIExpose, APIRoute } from "@scramjet/types";
import { Server } from "http";
import { DataStream } from "scramjet";
import { createGetterHandler } from "./handlers/get";
import { createOperationHandler } from "./handlers/op";
import { createStreamHandlers } from "./handlers/stream";
import { cero, sequentialRouter } from "./lib/0http";
import { CeroRouter, CeroRouterConfig } from "./lib/definitions";

export type ServerConfig = {
    verbose?: boolean;
    server?: Server;
    router?: CeroRouter;
};

export { cero, sequentialRouter };

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
    const log = new DataStream();
    const config: CeroRouterConfig = {
        defaultRoute: (req, res) => {
            const date = Date.now();

            res.writeHead(404);
            res.end();
            log.write({ date, method: req.method, url: req.url, status: 404 } as any);
        },
        errorHandler: (err, req, res) => {
            res.writeHead(err.code || 500, err.httpMessage);
            if (conf.verbose) res.end(err.stack);
            else res.end();

            log.write({ date: Date.now(), method: req.method, url: req.url, status: 500 } as any);
        }
    };
    const { server: srv, router } = cero({ server: conf.server, router: sequentialRouter(config) });
    const get = createGetterHandler(router);
    const op = createOperationHandler(router);
    const { upstream, downstream } = createStreamHandlers(router);

    log.resume();

    return {
        server: srv,
        get,
        op,
        upstream,
        downstream,
        log,
        use: (path, ...middlewares) => {
            router.use(path, ...middlewares);
        }
    };
}

export * from "./lib/definitions";

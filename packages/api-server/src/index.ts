import { APIExpose } from "@scramjet/types";
import { cero, sequentialRouter } from "./lib/0http";
import { CeroRouterConfig } from "./lib/definitions";
import { createGetterHandler } from "./handlers/get";
import { createOperationHandler } from "./handlers/op";
import { createStreamHandlers } from "./handlers/stream";

export function createServer(conf: { verbose?: boolean }): APIExpose {
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
    const { server, router } = cero({ router: sequentialRouter(config) });
    const get = createGetterHandler(router);
    const op = createOperationHandler(router);
    const { upstream, downstream } = createStreamHandlers(router);

    return {
        server,
        get,
        op,
        upstream,
        downstream
    };
}

export * from "./lib/definitions";

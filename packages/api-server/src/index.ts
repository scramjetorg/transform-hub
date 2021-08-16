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
    const { duplex, upstream, downstream } = createStreamHandlers(router);

    return {
        lookup: (...args) => router.lookup(...args),
        get,
        op,
        duplex,
        upstream,
        downstream
    };
}

export function createServer(conf: ServerConfig = {}): APIExpose {
    const log = new DataStream();
    const config: CeroRouterConfig = {
        defaultRoute: (req, res) => {
            res.writeHead(404);
            res.end();
        },
        errorHandler: (err, req, res) => {
            res.writeHead(err.code || 500, err.httpMessage);
            if (conf.verbose) res.end(err.stack);
            else res.end();
        }
    };
    const { server: srv, router } = cero({ server: conf.server, router: sequentialRouter(config) });

    router.use("/", async (req, res, next) => {
        console.log("MAIN ROUTER");
        try {
            next();
        } catch (e) {
            console.log("MAIN ROUTER", e);
        }
        log.write({ date: Date.now(), method: req.method, url: req.url, status: await new Promise(s => res.on("finish", () => s(res.statusCode))) } as any);
    });

    const get = createGetterHandler(router);
    const op = createOperationHandler(router);
    const { duplex, upstream, downstream } = createStreamHandlers(router);

    log.resume(); // if log is not read.

    return {
        server: srv,
        get,
        op,
        duplex,
        downstream,
        upstream,
        get log() {
            return log.pause(); // if log is accessed then it should be read
        },
        use: (path, ...middlewares) => {
            router.use(path, ...middlewares);
        }
    };
}

export * from "./lib/definitions";
export { DuplexStream } from "./lib/duplex-stream";

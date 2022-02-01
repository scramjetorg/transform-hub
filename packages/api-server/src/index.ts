import { ObjLogger } from "@scramjet/obj-logger";
import { APIExpose, APIRoute, MaybePromise, NextCallback } from "@scramjet/types";
import { IncomingMessage, ServerResponse, Server as HttpServer, createServer as createHttpServer } from "http";
import { Server as HttpsServer, createServer as createHttpsServer } from "https";
import { DataStream } from "scramjet";
import { createGetterHandler } from "./handlers/get";
import { createOperationHandler } from "./handlers/op";
import { createStreamHandlers } from "./handlers/stream";
import { cero, sequentialRouter } from "./lib/0http";
import { CeroRouter, CeroRouterConfig } from "./lib/definitions";

export type ServerConfig = {
    verbose?: boolean;
    server?: HttpsServer | HttpServer;
    sslKeyPath?: string;
    sslCertPath?: string;
    router?: CeroRouter;
};

export { cero, sequentialRouter };

const logger = new ObjLogger("ApiServer");

function safeHandler<T extends unknown[]>(cb: (...args: T) => MaybePromise<void>) {
    return async (...args: T) => {
        try {
            await cb(...args);
        } catch (err) {
            logger.error("Uncaught error in handler", err);
        }
    };
}

/**
 * Additional request processing goes here but please for the love of god do not consume payload here.
 * @param cb Decorator
 * @returns Handler
 */
function safeDecorator(cb: (req: IncomingMessage) => MaybePromise<void>) {
    return async (req: IncomingMessage, res: ServerResponse, next: NextCallback) => {
        try {
            await cb(req);
        } catch (err) {
            logger.error("Uncaught error in handler", err);
        } finally {
            next();
        }
    };
}

function createCeroServerConfig(conf: ServerConfig = {}): ServerConfig["server"] {
    if (conf.server) {
        return conf.server;
    }

    if (conf.sslKeyPath && conf.sslCertPath) {
        const fs = require("fs");
        const sslConfig = {
            key: fs.readFileSync(conf.sslKeyPath),
            cert: fs.readFileSync(conf.sslCertPath)
        };

        return createHttpsServer(sslConfig);
    }

    return createHttpServer();
}

export function getRouter(): APIRoute {
    const router = sequentialRouter({});
    const get = createGetterHandler(router);
    const op = createOperationHandler(router);
    const { duplex, upstream, downstream } = createStreamHandlers(router);
    const use = router.use;

    return {
        lookup: (...args) => router.lookup(...args),
        get,
        op,
        duplex,
        upstream,
        downstream,
        use
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
            log.write({ date: Date.now(), method: req.method, url: req.url, error: err.stack } as any);
            res.writeHead(err.code || 500, err.httpMessage);
            if (conf.verbose) res.end(err.stack);
            else res.end();
        }
    };
    const { server: srv, router } = cero({ server: createCeroServerConfig(conf), router: sequentialRouter(config) });

    router.use("/", async (req, res, next) => {
        next();
        // TODO: fix - this should log on errors.
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
            router.use(path, ...middlewares.map(safeHandler));
        },
        decorate: (path, ...decorators) => {
            router.use(path, ...decorators.map(safeDecorator));
        }
    };
}

export * from "./lib/definitions";
export { DuplexStream } from "./lib/duplex-stream";

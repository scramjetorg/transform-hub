import { ObjLogger } from "@scramjet/obj-logger";
import { APIRoute, APIServer, ForwardStrategy, ListenArgs, MaybePromise, Middleware, NextCallback, ParsedMessage } from "@scramjet/types";
import { IncomingMessage, ServerResponse, createServer as createHttpServer } from "http";
import { createServer as createHttpsServer } from "https";
import { DataStream } from "scramjet";
import { createGetterHandler } from "./handlers/get";
import { createCrudHandlers } from "./handlers/crud";
import { createOperationHandler } from "./handlers/op";
import { createStreamHandlers } from "./handlers/stream";
import { cero, sequentialRouter } from "./lib/0http";
import { CeroRouterConfig } from "./lib/definitions";
import type { ServerConfig } from "./types/ServerConfig";
import { createForwardController } from "./handlers/forward";
import { roundRobinStrategy } from "./strategies/round-robin";
export { createForwardController } from "./handlers/forward";
export { roundRobinStrategy } from "./strategies/round-robin";
export { consistentHashStrategy } from "./strategies/consistent-hash";

export { ServerConfiguration } from "./config/ServerConfiguration";
export type { ServerConfig } from "./types";

export { cero, sequentialRouter };

export const logger = new ObjLogger("ApiServer");

// logger.addOutput(process.stderr);

function safeHandler(value: Middleware): Middleware {
    return async (req: ParsedMessage, res: ServerResponse & { errorMessage?: string }, next: NextCallback) => {
        try {
            await value(req, res, next);
        } catch (err: Error | any) {
            res.errorMessage = err.message;
            next(err);
        }
    };
}

/**
 * Additional request processing goes here but please for the love of god do not consume payload here.
 * @param cb Decorator
 * @returns Handler
 */
function safeDecorator(cb: (req: IncomingMessage) => MaybePromise<void>) {
    return async (req: IncomingMessage, _res: ServerResponse, next: NextCallback) => {
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
    const crud = createCrudHandlers(router);
    const { duplex, upstream, downstream } = createStreamHandlers(router);
    const use = router.use;

    return {
        lookup: (...args) => router.lookup(...args),
        get,
        ...crud,
        op,
        duplex,
        upstream,
        downstream,
        use,
        forward: (path: string, urls: string[], strategy: ForwardStrategy = roundRobinStrategy) => {
            return use(path, createForwardController(path, urls, strategy));
        }
    };
}

export function createServer(conf: ServerConfig = {}, routerConfig?: CeroRouterConfig): APIServer {
    const log = new DataStream();
    const config: CeroRouterConfig = {
        defaultRoute: (_req, res) => {
            res.writeHead(404);
            res.end();
        },
        errorHandler: (err, req, res) => {
            log.write({ date: Date.now(), method: req.method, url: req.url, errorMessage: res.errorMessage, error: err.stack } as any);
            if (!res.headersSent) {
                if (typeof err.code === "number") {
                    res.writeHead(err.code || 500, err.httpMessage);
                } else if (err.code) {
                    res.writeHead(500, `${err.code}: ${err.httpMessage || err.message}`);
                }
            }
            if (conf.verbose) res.end(err.stack);
            else res.end();
        },
        ...routerConfig
    };
    const { server: srv, router } = cero({ server: createCeroServerConfig(conf), router: sequentialRouter(config) });

    // Disable auto sending "100 Continue".
    srv.on("checkContinue", (request, response) => {
        response.writeContinue();

        srv.emit("request", request, response);
    });

    router.use("/", async (req, res: ServerResponse & { errorMessage?: string }, next) => {
        req.writeContinue ||= () => {};

        next();
        const status = await new Promise(s => res.on("finish", () => s(res.statusCode)));
        const message = res.errorMessage;

        log.write({ date: Date.now(), method: req.method, url: req.url, status, message } as any);
    });

    const get = createGetterHandler(router);
    const op = createOperationHandler(router);
    const crud = createCrudHandlers(router);
    const { duplex, upstream, downstream } = createStreamHandlers(router);

    log.resume(); // if log is not read.

    let paused = false;

    function listen(...args: ListenArgs) {
        return new Promise<void>((res, rej) => {
            srv
                .on("error", rej)
                .listen(...args, res)
            ;
        });
    }

    return {
        server: srv,
        listen,
        get,
        op,
        duplex,
        downstream,
        upstream,
        ...crud,
        get log() {
            if (!paused) {
                log.pause(); // if log is accessed then it should be read
                paused = true;
            }
            return log;
        },
        use: (path, ...middlewares) => {
            router.use(path, ...middlewares.map(safeHandler));
        },
        decorate: (path, ...decorators) => {
            router.use(path, ...decorators.map(safeDecorator));
        },
        forward: (path, urls, strategy = roundRobinStrategy) => {
            router.use(path, createForwardController(path, urls, strategy));
        }
    };
}

export * from "./lib/definitions";
export { DuplexStream } from "./lib/duplex-stream";

export { corsMiddleware } from "./middlewares/cors";
export { optionsMiddleware } from "./middlewares/options";

import { ObjLogger } from "@scramjet/obj-logger";
import { MaybePromise } from "@scramjet/runtime-types";
import { APIRoute, APIServer, ForwardStrategy, ListenArgs, Middleware, NextCallback, ParsedMessage } from "@scramjet/api-types";
import { IncomingMessage, RequestListener, ServerResponse, createServer as createHttpServer } from "http";
import { registerHttpRoutes, RouterDefinition } from "@scramjet/api-router";
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
export { forwardRoutedRequest, normalizeForwardedHeaders } from "./handlers/routed-forward";
export type { RoutedForwardTransport, RoutedForwardTransportResponse } from "./handlers/routed-forward";
export { parseRoutedRedirect } from "./handlers/routed-redirect";
export type { RoutedRedirectParseResult } from "./handlers/routed-redirect";
export { roundRobinStrategy } from "./strategies/round-robin";
export { consistentHashStrategy } from "./strategies/consistent-hash";

export { ServerConfiguration } from "./config/ServerConfiguration";
export type { ServerConfig } from "./types";

export { cero, sequentialRouter };

export type V2HttpDispatcher = {
    listener: RequestListener;
};

export const logger = new ObjLogger("ApiServer");

// logger.addOutput(process.stderr);

function safeHandler(value: Middleware): Middleware {
    return async (req: ParsedMessage, res: ServerResponse & { errorMessage?: string }, next: NextCallback) => {
        try {
            await value(req, res, next);
        } catch (err: any) {
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

export function getRouter(routerConfig: CeroRouterConfig = {}): APIRoute {
    const router = sequentialRouter(routerConfig);
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

/**
 * Creates an in-memory HTTP surface for one implemented v2 router. A Verser2
 * Guest owns transport lifecycle and invokes the returned listener directly.
 */
export function createV2HttpDispatcher(runtimeRouter: RouterDefinition): V2HttpDispatcher {
    const routes = runtimeRouter.collectedRoutes();
    const resolvers = runtimeRouter.collectedResolvers();

    for (const { route, entry } of routes) {
        if (entry.fullPath !== "/api/v2" && !entry.fullPath.startsWith("/api/v2/")) {
            throw new Error(`V2 HTTP dispatcher only accepts /api/v2 routes: ${entry.fullPath}`);
        }
        if (!route.handler) {
            throw new Error(`V2 HTTP dispatcher cannot register handlerless contract-only route: ${entry.id}`);
        }
    }

    for (const { entry } of resolvers) {
        if (entry.fullPath !== "/api/v2" && !entry.fullPath.startsWith("/api/v2/")) {
            throw new Error(`V2 HTTP dispatcher only accepts /api/v2 resolvers: ${entry.fullPath}`);
        }
    }

    const router = getRouter();
    const rejectV1: Middleware = (_req, res) => {
        res.writeHead(404);
        res.end();
    };

    router.use("/api/v1", rejectV1);
    router.use("/api/v1/*", rejectV1);
    registerHttpRoutes(router, runtimeRouter);

    return {
        listener: (req, res) => {
            router.lookup(req as ParsedMessage, res, error => {
                if (error) {
                    if (!res.headersSent) res.writeHead(500);
                    if (!res.writableEnded) res.end();
                    return;
                }
                if (!res.headersSent && !res.writableEnded) {
                    res.writeHead(404);
                    res.end();
                }
            });
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

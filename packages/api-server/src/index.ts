import { cero, sequentialRouter } from "./0http";
import { CeroRouterConfig } from "./definitions";
import { createGetterHandler } from "./get-handler";
import { createStreamHandler } from "./stream-handler";

export function createServer(conf: { verbose?: boolean }) {
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
    const { upstream } = createStreamHandler(router);

    return {
        server, router,
        get,
        op(_path: string|RegExp, _op: (args: any) => void): void {

        },
        upstream
    };
}


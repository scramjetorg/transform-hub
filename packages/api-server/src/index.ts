import { Stream } from "stream";
import { cero, CeroRouterConfig, sequentialRouter } from "./0http";
import { createGetterHandler } from "./get-handler";

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

    return {
        server, router,
        get,
        op(_path: string|RegExp, _op: (args: any) => void): void {

        },
        stream(_path: string|RegExp, _stream: Stream, _config: any): void {

        }
    };
}


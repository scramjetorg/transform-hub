import { CommunicationHandler, MonitoringMessageData, RunnerMessageCode } from "@scramjet/model";
import { MonitoringMessageCode, WritableStream } from "@scramjet/types";
import { Readable, Writable } from "node:stream";
import { cero, sequentialRouter } from "./0http";
import { CeroRouterConfig } from "./definitions";
import { createGetterHandler } from "./get-handler";
import { createStreamHandlers } from "./stream-handler";

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
    const { upstream, downstream } = createStreamHandlers(router);

    return {
        server,
        router,
        get(_path: string|RegExp, _op: MonitoringMessageCode, _conn: CommunicationHandler): void {
            let lastItem: MonitoringMessageData|null = null;

            _conn.addMonitoringHandler(_op, (data) => {
                lastItem = data[1];
                return data;
            });

            router.add();
        },
        op(_path: string|RegExp, _op: RunnerMessageCode, _conn: CommunicationHandler): void {

        },
        upstream,
        downstream
    };
}

export * from "./definitions";

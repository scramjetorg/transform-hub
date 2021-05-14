import { GetResolver, ICommunicationHandler, MessageDataType, MonitoringMessageCode } from "@scramjet/types";
import { IncomingMessage, ServerResponse } from "http";
import { CeroError, NextCallback, SequentialCeroRouter } from "../lib/definitions";
import { mimeAccepts } from "../lib/mime";

export function createGetterHandler(router: SequentialCeroRouter) {
    const check = (req: IncomingMessage): void => {
        if (req.headers.accept) mimeAccepts(req.headers.accept, ["application/json", "text/json"]);
    };
    const output = (data: object, res: ServerResponse, next: NextCallback) => {
        try {
            if (data === null) {
                res.writeHead(204, "No content", {
                    "content-type": "application/json"
                });
                return res.end();
            }

            const out = JSON.stringify(data);

            res.writeHead(200, "OK", {
                "content-type": "application/json"
            });
            return res.end(out);
        } catch (e) {
            return next(new CeroError("ERR_FAILED_TO_SERIALIZE", e));
        }
    };
    const get1 = <T extends MonitoringMessageCode>(path: string | RegExp, op: T, conn: ICommunicationHandler): void => {
        let lastItem: MessageDataType<T> | null = null;

        conn.addMonitoringHandler(op, (data) => {
            lastItem = data[1];
            return data;
        });

        router.get(path, async (req, res, next) => {
            try {
                check(req);
                return output(lastItem as object, res, next);
            } catch (e) {
                return next(new CeroError("ERR_INTERNAL_ERROR", e));
            }
        });
    };
    const get2 = (path: string | RegExp, callback: GetResolver): void => {
        router.get(path, async (req, res, next) => {
            try {
                check(req);
                return output(await callback(req), res, next);
            } catch (e) {
                return next(new CeroError("ERR_INTERNAL_ERROR", e));
            }
        });
    };

    return <T extends MonitoringMessageCode>(
        path: string | RegExp, msg: GetResolver | T, conn?: ICommunicationHandler
    ) => {
        if (typeof msg === "function") {
            return get2(path, msg);
        }
        if (!conn) throw new Error("Communication handler not passed");

        return get1(path, msg, conn);
    };
}

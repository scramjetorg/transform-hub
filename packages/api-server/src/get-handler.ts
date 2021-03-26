import { CeroError, NextCallback, SequentialCeroRouter } from "./definitions";
import { MonitoringMessageCode } from "@scramjet/types";
import { CommunicationHandler, MessageDataType } from "@scramjet/model";
import { IncomingMessage, ServerResponse } from "node:http";
import { mimeAccepts } from "./mime";
import { getObject } from "./data-extractors";

export function createGetterHandler(router: SequentialCeroRouter) {
    const check = (req: IncomingMessage): void => {
        if (req.headers.accept) mimeAccepts(req.headers.accept, ["application/json", "text/json"]);
    };
    const output = (data: object, req: IncomingMessage, res: ServerResponse, next: NextCallback) => {
        try {
            const out = JSON.stringify(data);

            res.writeHead(200, "OK", {
                "content-type": "application/json"
            });
            return res.end(out);
        } catch (e) {
            return next(new CeroError("ERR_FAILED_TO_SERIALIZE", e));
        }
    };
    const get = <T extends MonitoringMessageCode>(path: string|RegExp, op: T, conn: CommunicationHandler): void => {
        let lastItem: MessageDataType<T>|null = null;

        conn.addMonitoringHandler(op, (data) => {
            lastItem = data[1];
            return data;
        });

        router.get(path, async (req, res, next) => {
            try {
                check(req);
                const data = await getObject(lastItem, req);

                return output(data, req, res, next);
            } catch (e) {
                return next(new CeroError("ERR_INTERNAL_ERROR", e));
            }
        });
    };

    return get;
}

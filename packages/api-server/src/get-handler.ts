import { IncomingMessage, ServerResponse } from "http";
import { CeroError, NextCallback, SequentialCeroRouter } from "./definitions";
import { getObject } from "./data-extractors";
import { mimeAccepts } from "./mime";

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

    return function getHandler(path: string | RegExp, object: any): void {
        router.get(path, async (req, res, next) => {
            let data;

            try {
                check(req);
                data = await getObject(req, object);
                return output(data, req, res, next);
            } catch (e) {
                return next(new CeroError("ERR_INTERNAL_ERROR", e));
            }
        });
    };
}

import { IncomingMessage, ServerResponse } from "http";
import { CeroError, NextCallback, SequentialCeroRouter } from "./0http";

export function createGetterHandler(router: SequentialCeroRouter) {
    const check = (req: IncomingMessage): void => {
        if (req.headers.accept) {
            const accepts = req.headers.accept.split(",");

            for (let item of accepts) {
                const [mime] = item.split(";q=");

                if (["application/json", "text/json"].includes(mime))
                    return;
            }

            throw new CeroError("ERR_UNKNOWN_CONTENT_TYPE_REQUESTED");
        }
    };
    const decorator = (data: object, req: IncomingMessage, res: ServerResponse, next: NextCallback) => {
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
                if (object instanceof Function) {
                    data = await object(req);
                } else if (object instanceof Promise) {
                    data = await object;
                } else {
                    data = object;
                }
            } catch (e) {
                return next(new CeroError("ERR_FAILED_FETCH_DATA", e));
            }

            return decorator(data, req, res, next);
        });
    };
}

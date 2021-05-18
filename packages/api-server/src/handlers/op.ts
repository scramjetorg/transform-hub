import { CeroError, SequentialCeroRouter } from "../lib/definitions";
import { ControlMessageCode, ICommunicationHandler, MessageDataType, NextCallback, OpResolver } from "@scramjet/types";
import { checkMessage } from "@scramjet/model";
import { IncomingMessage, ServerResponse } from "http";
import { mimeAccepts } from "../lib/mime";
import { StringDecoder } from "string_decoder";

export function createOperationHandler(router: SequentialCeroRouter) {
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
    const getData = async (req: IncomingMessage): Promise<object|undefined> => {
        if (!req.headers["content-type"])
            throw new CeroError("ERR_INVALID_CONTENT_TYPE");

        mimeAccepts(req.headers["content-type"], ["application/json", "text/json"]);

        const encodings = req.headers["content-type"].match(/charset=([-\w\d]+)/);
        const encoding = encodings ? encodings[1] : "utf-8";

        if (encoding !== "utf-8") {
            throw new CeroError("ERR_UNSUPPORTED_ENCODING");
        }

        if (req.headers["content-length"] === "0") {
            return undefined;
        }

        const decoder = new StringDecoder(encoding);

        let out = "";

        for await (const chunk of req) {
            out += decoder.write(chunk);
        }
        out += decoder.end();

        try {
            if (!out) {
                return undefined;
            }

            return JSON.parse(out)[1];
        } catch (e) {
            throw new CeroError("ERR_CANNOT_PARSE_CONTENT");
        }
    };
    const opResolver = (path: string | RegExp, callback: OpResolver): void => {
        router.post(path, async (req, res, next) => {
            try {
                check(req);
                return output(await callback(req), res, next);
            } catch (e) {
                return next(new CeroError("ERR_INTERNAL_ERROR", e));
            }
        });
    };
    /**
     * Simple POST request hook for static data in monitoring stream.
     *
     * @param path the request path as string or regex
     * @param message which operation
     * @param conn the communication handler to use
     */
    const op = <T extends ControlMessageCode>(
        path: string|RegExp, message: T | OpResolver, conn: ICommunicationHandler): void => {
        router.post(path, async (req, res, next) => {
            try {
                if (typeof message === "function") return opResolver(path, message);

                const obj = await getData(req) as MessageDataType<T>;

                await conn.sendControlMessage(message, checkMessage(message, obj));

                res.writeHead(202, "Accepted", { "content-type": "application/json" });
                return res.end();
            } catch (e) {
                return next(new CeroError("ERR_INTERNAL_ERROR", e));
            }
        });
    };

    return op;
}

import { CeroError, SequentialCeroRouter } from "./definitions";
import { ControlMessageCode } from "@scramjet/types";
import { CommunicationHandler, checkMessage, MessageDataType } from "@scramjet/model";
import { IncomingMessage } from "http";
import { mimeAccepts } from "./mime";
import { StringDecoder } from "node:string_decoder";

export function createOperationHandler(router: SequentialCeroRouter) {
    const getData = async (req: IncomingMessage): Promise<object> => {
        if (!(req.headers["content-type"]))
            throw new CeroError("ERR_INVALID_CONTENT_TYPE");

        mimeAccepts(req.headers["content-type"], ["application/json", "text/json"]);

        const encodings = req.headers["content-type"].match(/charset=([-\w\d]+)/);
        const encoding = encodings ? encodings[1] : "utf-8";

        if (encoding !== "utf-8") throw new CeroError("ERR_UNSUPPORTED_ENCODING");

        const out = new StringDecoder();
        for await (const chunk of req) {
            out.write(chunk);
        }

        try {
            return JSON.parse(out.end());
        } catch(e) {
            throw new CeroError("ERR_CANNOT_PARSE_CONTENT");
        }
    };
    /**
     * Simple POST request hook for static data in monitoring stream.
     *
     * @param path the request path as string or regex
     * @param message which operation
     * @param conn the communication handler to use
     */
    const op = <T extends ControlMessageCode>(path: string|RegExp, message: T, conn: CommunicationHandler): void => {
        router.post(path, async (req, res, next) => {
            try {
                const obj = await getData(req) as MessageDataType<T>;
                conn.sendControlMessage(message, checkMessage(message, obj));

                res.writeHead(202, "Accepted", { "content-type": "application/json" });
                return res.end();
            } catch (e) {
                return next(new CeroError("ERR_INTERNAL_ERROR", e));
            }
        });
    };

    return op;
}

import { CeroError, SequentialCeroRouter } from "../lib/definitions";
import { ControlMessageCode, ICommunicationHandler, MessageDataType, Middleware, OpResolver, ParsedMessage } from "@scramjet/types";
import { checkMessage } from "@scramjet/model";
import { IncomingMessage } from "http";
import { mimeAccepts } from "../lib/mime";
import { StringDecoder } from "string_decoder";
import { getStatusCode, ReasonPhrases, StatusCodes } from "http-status-codes";
import { getLogger } from "@scramjet/logger";

const logger = getLogger("API");

export function createOperationHandler(router: SequentialCeroRouter) {
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

            return JSON.parse(out);
        } catch (e) {
            throw new CeroError("ERR_CANNOT_PARSE_CONTENT");
        }
    };
    /**
     * Simple POST request hook for static data in monitoring stream.
     *
     * @param method request method
     * @param path the request path as string or regex
     * @param message which operation
     * @param conn the communication handler to use
     */
    const op = <T extends ControlMessageCode>(
        method: string = "post",
        path: string|RegExp, message: T | OpResolver, conn: ICommunicationHandler): void => {
        const handler: Middleware = async (req, res, next) => {
            logger.log(req.method, req.url);
            try {
                if (typeof message === "function") {
                    // eslint-disable-next-line no-extra-parens
                    const parsedReq = req as ParsedMessage;

                    parsedReq.body = await getData(req);

                    const result = await message(parsedReq, res);

                    let response = "";

                    if (result) {
                        result.opStatus = result.opStatus || ReasonPhrases.OK;

                        const statusCode = getStatusCode(result.opStatus);
                        const reason = result.opStatus;

                        res.writeHead(
                            statusCode,
                            reason,
                            { "content-type": "application/json" }
                        );

                        delete result.opStatus;

                        if (Object.keys(result).length) {
                            response = JSON.stringify(result);
                        }
                    } else {
                        res.writeHead(StatusCodes.NOT_FOUND, ReasonPhrases.NOT_FOUND, { "content-type": "application/json" });
                    }

                    return res.end(response);
                }

                // eslint-disable-next-line no-extra-parens
                const obj = (await getData(req) as Array<any>)[1] as MessageDataType<T>;

                await conn.sendControlMessage(message, checkMessage(message, obj));

                res.writeHead(StatusCodes.ACCEPTED, ReasonPhrases.ACCEPTED, { "content-type": "application/json" });
                return res.end();
            } catch (e) {
                return next(e);
            }
        };

        switch (method) {
        case "delete":
            router.delete(path, handler);
            break;
        default:
            router.post(path, handler);
        }
    };

    return op;
}

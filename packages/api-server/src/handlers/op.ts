import { CeroError, SequentialCeroRouter } from "../lib/definitions";
import { APIRoute, ControlMessageCode, ICommunicationHandler, MessageDataType, Middleware, OpResolver } from "@scramjet/types";
import { checkMessage } from "@scramjet/model";
import { IncomingMessage } from "http";
import { mimeAccepts } from "../lib/mime";
import { StringDecoder } from "string_decoder";
import { getStatusCode, ReasonPhrases, StatusCodes } from "http-status-codes";
import { getLogger } from "@scramjet/logger";

const logger = getLogger("API");

/**
 * Creates and returns a method to set up a POST/DELETE handlers for the given path.
 *
 * @param {SequentialCeroRouter} router Router to use.
 * @returns Operation handler.
 */
export function createOperationHandler(router: SequentialCeroRouter): APIRoute["op"] {
    /**
     * Tries to parse data from the request body.
     *
     * @param {IncomingMessage} req Request object.
     * @returns JSON object.
     */
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
        } catch (e: any) {
            throw new CeroError("ERR_CANNOT_PARSE_CONTENT");
        }
    };

    /**
     * Simple POST/DELETE request hook.
     * Creates a Middleware for given method and path.
     * This method can be used in two ways - as a control message handler or as a data handler.
     *
     * @example
     * // Control message handler
     * router.op("post", "/_kill", RunnerMessageCode.KILL, this.communicationHandler);
     * // Data handler
     * router.op("post", `${this.apiBase}/start`, (req) => this.handleStartRequest(req));
     *
     * @param {string} method Request method.
     * @param {string|RegExp} path Request address.
     * @param {OpResolver} message which operation.
     * @param {ICommunicationHandler} conn the communication handler to use.
     */
    const op = <T extends ControlMessageCode>(
        method: string = "post",
        path: string|RegExp, message: T | OpResolver, conn: ICommunicationHandler): void => {
        const handler: Middleware = async (req, res, next) => {
            logger.log(req.method, req.url);
            try {
                if (typeof message === "function") {
                    req.body = await getData(req);

                    const result = await message(req, res);

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
            } catch (e: any) {
                return next(e);
            }
        };

        switch (method) {
        case "post":
            router.post(path, handler);
            break;
        case "delete":
            router.delete(path, handler);
            break;
        default:
            throw new Error("ERR_UNSUPPORTED_METHOD");
        }
    };

    return op;
}

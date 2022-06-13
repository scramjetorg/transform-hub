import { CeroError, SequentialCeroRouter } from "../lib/definitions";
import {
    APIRoute,
    ControlMessageCode,
    ICommunicationHandler,
    MessageDataType,
    Middleware,
    OpOptions,
    OpResolver,
    ParsedMessage,
} from "@scramjet/types";
import { checkMessage } from "@scramjet/model";
import { IncomingMessage, ServerResponse } from "http";
import { mimeAccepts } from "../lib/mime";
import { StringDecoder } from "string_decoder";
import { getStatusCode, ReasonPhrases, StatusCodes } from "http-status-codes";
import { ObjLogger } from "@scramjet/obj-logger";

const logger = new ObjLogger("API");

/**
 * Creates and returns a method to set up a POST/DELETE handlers for the given path.
 *
 * @param {SequentialCeroRouter} router Router to use.
 * @returns Operation handler.
 */
export function createOperationHandler(router: SequentialCeroRouter): APIRoute["op"] {
    /**
     * Checking content-type and getting encoding from request
     * @param {IncomingMessage} req Request object.
     * @param {OpOptions} options Options for encoding getter.
     * @returns BufferEncoding string
     */
    const getEncoding = (req: IncomingMessage, { rawBody }: OpOptions = {}): BufferEncoding => {
        if (!req.headers["content-type"]) throw new CeroError("ERR_INVALID_CONTENT_TYPE");

        if (!rawBody) mimeAccepts(req.headers["content-type"], ["application/json", "text/json"]);

        const encodings = req.headers["content-type"].match(/charset=([-\w\d]+)/);
        const encoding = encodings ? encodings[1] : "utf-8";

        if (encoding !== "utf-8") {
            throw new CeroError("ERR_UNSUPPORTED_ENCODING");
        }

        return encoding;
    };

    /**
     * Getting body out of request
     * @param {IncomingMessage} req Request object.
     * @param {BufferEncoding} encoding Encoding for string decoder
     * @returns Promise with req body string or undefined
     */
    const getBody = async (req: IncomingMessage, encoding: BufferEncoding) => {
        if (req.headers["content-length"] === "0") {
            return undefined;
        }

        const decoder = new StringDecoder(encoding);

        let out = "";

        for await (const chunk of req) {
            out += decoder.write(chunk);
        }
        out += decoder.end();

        return out;
    };

    /**
     * Tries to parse data from the request body.
     *
     * @param {IncomingMessage} req Request object.
     * @param {OpOptions} options Options for data parser.
     * @returns JSON object.
     */
    const getData = async (req: IncomingMessage, { rawBody }: OpOptions = {}): Promise<object | undefined> => {
        const encoding = getEncoding(req, { rawBody });
        const body = await getBody(req, encoding);

        try {
            return body && (rawBody ? body : JSON.parse(body));
        } catch (e: any) {
            throw new CeroError("ERR_CANNOT_PARSE_CONTENT");
        }
    };

    /**
     * Handler for data calls
     * @param {IncomingMessage} req Request object.
     * @param {ServerResponse} res Server response.
     * @param {OpResolver} resolver Data callback
     * @param {OpOptions} options Handler options.
     * @returns void
     */
    const opDataHandler = async (
        req: ParsedMessage,
        res: ServerResponse,
        resolver: OpResolver,
        { rawBody }: OpOptions = {}
    ) => {
        req.body = await getData(req, { rawBody });

        const result = await resolver(req, res);

        let response = "{}";

        if (result) {
            result.opStatus = result.opStatus || ReasonPhrases.OK;

            const statusCode = getStatusCode(result.opStatus);
            const reason = result.opStatus;

            res.writeHead(statusCode, reason, { "content-type": "application/json" });

            if (Object.keys(result).length) {
                response = JSON.stringify(result);
            }
        } else {
            res.writeHead(StatusCodes.NOT_FOUND, ReasonPhrases.NOT_FOUND, {
                "content-type": "application/json",
            });
        }

        return res.end(response);
    };

    /**
     * Control Message handler
     * @param {IncomingMessage} req Request object.
     * @param {ServerResponse} res Server response.
     * @param {ControlMessageCode} message Control message.
     * @param {ICommunicationHandler} comm Communication handler.
     * @returns void
     */
    const opControlMessageHandler = async <T extends ControlMessageCode>(
        req: ParsedMessage,
        res: ServerResponse,
        message: T,
        comm: ICommunicationHandler
    ) => {
        // eslint-disable-next-line no-extra-parens
        const obj = ((await getData(req)) as Array<any>)[1] as MessageDataType<T>;

        await comm.sendControlMessage(message, checkMessage(message, obj));

        res.writeHead(StatusCodes.ACCEPTED, ReasonPhrases.ACCEPTED, { "content-type": "application/json" });
        return res.end(JSON.stringify({ accepted: true }));
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
     * @param {ControlMessageCode|OpResolver} message which operation.
     * @param {ICommunicationHandler} comm Communication handler.
     * @param {boolean} rawBody Flag if the body will be parsed.
     */
    const op = <T extends ControlMessageCode>(
        method: string = "post",
        path: string | RegExp,
        message: T | OpResolver,
        comm?: ICommunicationHandler,
        rawBody?: boolean
    ): void => {
        const handler: Middleware = async (req, res, next) => {
            logger.trace("Request", req.method, req.url);

            try {
                if (typeof message === "function") {
                    return await opDataHandler(req, res, message, { rawBody });
                }
                if (comm) {
                    return await opControlMessageHandler(req, res, message, comm);
                }
                throw new Error("ERR_UNSUPPORTED_HANDLER_CONFIGURATION");
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

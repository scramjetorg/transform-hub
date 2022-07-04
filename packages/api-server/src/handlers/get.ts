import { APIRoute, GetResolver, ICommunicationHandler, MessageDataType, MonitoringMessageCode, NextCallback } from "@scramjet/types";
import { CeroError, SequentialCeroRouter } from "../lib/definitions";
import { mimeAccepts } from "../lib/mime";
import { IncomingMessage, ServerResponse } from "http";
import { getStatusCode } from "http-status-codes";

/**
 * Returns function to create GET handler for the given router.
 *
 * @param {SequentialCeroRouter} router Router to create handler for.
 * @returns Function to create GET handler for the given router.
 */
export function createGetterHandler(router: SequentialCeroRouter): APIRoute["get"] {
    /**
     * Performs check for accepted mime types in request.
     *
     * @param {IncomingMessage} req Request object.
     */
    const check = (req: IncomingMessage): void => {
        if (req.headers.accept) {
            mimeAccepts(req.headers.accept, ["application/json", "text/json"]);
        }
    };
    /**
     * Writes output to response stream. If no data is provided ends response with empty response status.
     *
     * @param {object} data Output data.
     * @param {ServerResponse} res Response object.
     * @param {NextCallback} next Next callback.
     * @returns Unused.
     */
    const output = (data: any, res: ServerResponse, next: NextCallback): void => {
        try {
            if (data === null) {
                res.writeHead(204, "No content", {
                    "content-type": "application/json"
                });

                return res.end();
            }

            let statusCode = 200;
            let reason = "OK";

            if (data.opStatus) {
                statusCode = getStatusCode(data.opStatus);
                reason = data.opStatus;

                delete data.opStatus;
            }

            const out = Array.isArray(data) || Object.keys(data).length ? JSON.stringify(data) : undefined;

            res.writeHead(statusCode, reason, {
                "content-type": "application/json"
            });

            return res.end(out);
        } catch (e: any) {
            return next(new CeroError("ERR_FAILED_TO_SERIALIZE", e));
        }
    };
    /**
     * Registers handler for given monitoring message code.
     *
     * @param {string|RegExp} path Path to register handler for.
     * @param {MonitoringMessageCode} op Message code.
     * @param {ICommunicationHandler} conn Communication handler to use monitoring stream from.
     */
    const getMonitoring = <T extends MonitoringMessageCode>(
        path: string | RegExp, op: T, conn: ICommunicationHandler
    ): void => {
        let lastItem: MessageDataType<T> | null = null;
        let monitoringMessageResolve: Function;

        const monitoringMessagePromise = new Promise((res) => {
            monitoringMessageResolve = res;
        });

        conn.addMonitoringHandler(op, (data) => {
            lastItem = data[1];
            monitoringMessageResolve();

            return data;
        });

        router.get(path, async (req, res, next) => {
            try {
                await monitoringMessagePromise;
                check(req);

                return output(lastItem as object, res, next);
            } catch (e: any) {
                return next(new CeroError("ERR_INTERNAL_ERROR", e));
            }
        });
    };

    /**
     * Registers handler for a given path.
     *
     * @param {string | RegExp} path Path to register handler for.
     * @param {GetResolver} callback Callback to register.
     */
    const getResolver = (path: string | RegExp, callback: GetResolver): void => {
        router.get(path, async (req, res, next) => {
            try {
                check(req);
                return output(await callback(req), res, next);
            } catch (e: any) {
                return next(new CeroError("ERR_INTERNAL_ERROR", e));
            }
        });
    };

    return <T extends MonitoringMessageCode>(
        path: string | RegExp, msg: GetResolver | T, conn?: ICommunicationHandler
    ) => {
        if (typeof msg === "function") {
            return getResolver(path, msg);
        }

        if (!conn) {
            throw new Error("Communication handler not passed");
        }

        return getMonitoring(path, msg, conn);
    };
}

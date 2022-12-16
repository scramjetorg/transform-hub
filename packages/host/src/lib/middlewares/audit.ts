import { IDProvider } from "@scramjet/model";
import { ObjLogger } from "@scramjet/obj-logger";
import { NextCallback, ParsedMessage } from "@scramjet/types";
import { ServerResponse } from "http";
import { AuditedRequest, Auditor } from "../auditor";

const ACTIVE_REQUEST_AUDIT_INTERVAL = 1000;
const ACTIVE_REQUEST_AUDIT_MIN_X_DELTA = 65536;

export const logger = new ObjLogger("AuditMiddleware");
export const auditMiddleware = (auditor: Auditor) => (req: ParsedMessage, res: ServerResponse, next: NextCallback) => {
    const request = req as AuditedRequest;

    if (request.auditData) {
        return next();
    }

    let rx = 0;
    let tx = 0;

    request.auditData = {
        id: IDProvider.generate(),
        object: (request.params || {}).id,
        tx: 0,
        rx: 0,
        requestorId: (request.headers["x-mw-billable"] || "system") as string
    };

    auditor.auditRequest(request, "START");

    request.on("data", (chunk) => {
        request.auditData.rx += chunk.length;
    }).pause();

    const write = res.write;

    type Callback = ((error: Error | null | undefined) => void) | undefined;
    type WriteType = (chunk: any, encoding: BufferEncoding, cb: Callback) => boolean;

    (res.write as WriteType) = (chunk: any, encoding: BufferEncoding, cb: Callback) => {
        request.auditData.tx += chunk.length;

        return write.apply(res, [chunk, encoding, cb]);
    };

    const interval = setInterval(() => {
        if (request.auditData.rx - rx + request.auditData.tx - tx >= ACTIVE_REQUEST_AUDIT_MIN_X_DELTA) {
            auditor.auditRequest(request, "ACTIVE");

            rx = request.auditData.rx;
            tx = request.auditData.tx;
        }
    }, ACTIVE_REQUEST_AUDIT_INTERVAL);

    Promise.all([
        new Promise((resolve, reject) => {
            req.once("end", resolve);
            req.once("close", reject);
            req.once("error", reject);
        }),
        new Promise((resolve, reject) => {
            res.once("finish", resolve);
            res.once("error", reject);
        }),
    ])
        .then(() => {
            auditor.auditRequest(request, "END");
        })
        .catch(() => {
            auditor.auditRequest(request, "ERROR");
        })
        .finally(() => {
            clearInterval(interval);
        });

    return next();
};

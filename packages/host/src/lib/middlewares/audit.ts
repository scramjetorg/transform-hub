import { IDProvider } from "@scramjet/model";
import { ObjLogger } from "@scramjet/obj-logger";
import { NextCallback, ParsedMessage,  } from "@scramjet/types";
import { ServerResponse } from "http";
import { AuditedRequest, Auditor } from "../auditor";

const ACTIVE_REQUEST_AUDIT_INTERVAL = 1000;

export const logger = new ObjLogger("Audit");
export const auditMiddleware = (auditor: Auditor) => (req: ParsedMessage, res: ServerResponse, next: NextCallback) => {
    const request = req as AuditedRequest;

    if (request.auditData) {
        return next();
    }

    let rx = req.socket.bytesRead;
    let tx = req.socket.bytesWritten;

    request.auditData = {
        id: IDProvider.generate(),
        object: (req.params || {}).id
    };

    auditor.auditRequest(request, "START");

    const interval = setInterval(() => {
        if (req.socket.bytesRead !== rx || req.socket.bytesWritten !== tx) {
            auditor.auditRequest(request, "ACTIVE");

            rx = req.socket.bytesRead;
            tx = req.socket.bytesWritten;
        }
    }, ACTIVE_REQUEST_AUDIT_INTERVAL);

    Promise.all([
        new Promise((resolve, reject) => {
            req.on("end", resolve);
            req.on("close", reject);
            req.on("error", reject);
        }),
        new Promise((resolve, reject) => {
            res.on("finish", resolve);
            res.on("error", reject);
        })
    ])
    .then(() => {
        auditor.auditRequest(request, "END");
    }).catch(() => {
        auditor.auditRequest(request, "ERROR");
    }).finally(() => {
        clearInterval(interval);
    });

    return next();
};

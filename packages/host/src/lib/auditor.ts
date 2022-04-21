import { ObjLogger } from "@scramjet/obj-logger";
import { ParsedMessage } from "@scramjet/types";
import { StringStream } from "scramjet";

type AuditData = {
    id: string;
    object?: string;
}
export type AuditedRequest = ParsedMessage & { auditData: AuditData };
export type AuditorMessage = {
    /**
     * Operation type.
     */
    op: number;

    /**
     * Request status.
     */
    status: "START" | "ACTIVE" | "END" | "ERROR";

    /**
     * Object id the request is about.
     */
    object: string;

    /**
     * Unique request id.
     */
    reqId?: string;

    /*
     * Downstream bytes sent (bytes received)
     */
    rx?: number;

    /*
     * Upstream bytes sent (bytes sent)
     */
    tx?: number;

    /**
     * User assigned string.
     */
    user: string;
}

export class Auditor {
    auditStream = new StringStream();
    logger = new ObjLogger(this);

    write(msg: AuditorMessage) {
        this.auditStream.write(JSON.stringify({
            ...msg,
            ts: Date.now()
        }) + "\n");
    }

    /**
     *
     * @param {IncommingMessage} req Request.
     * @returns {number} Operation code. 0 if not found.
     */
    getOpCode(req: ParsedMessage): number {
        const { type, op } = req.params || {};

        const i = ["sequence", "instance", "topic"].indexOf(type);

        if (i === -1) {
            return 0;
        }

        let code = 10000 + i * 1000;

        code += (["post", "get", "put", "delete"].indexOf(req.method!.toLowerCase()) + 1) * 100;
        code += [
            // Instance endpoints
            "stdout", "stderr", "stdin", "log", "monitoring",
            "output", "input", "health", "events", "event", "once",
            "_monitoring_rate",
            "_event", "_stop", "_kill",

            // Sequence endpoints
            "instances", "start"
        ].indexOf(op) + 1;

        return code;
    }

    auditRequest(req: AuditedRequest, status: AuditorMessage["status"]) {
        const op = this.getOpCode(req);

        if (op) {
            this.write({
                status,
                op,
                reqId: req.auditData.id,
                object: (req.params || {}).id,
                user: req.headers["x-mw-user"] as string,
                rx: req.socket.bytesRead,
                tx: req.socket.bytesWritten
            });
        }
    }
}

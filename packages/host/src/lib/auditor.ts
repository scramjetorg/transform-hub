import { ObjLogger } from "@scramjet/obj-logger";
import { OpRecord, ParsedMessage } from "@scramjet/types";
import { OpRecordCode } from "@scramjet/symbols";
import { StringStream } from "scramjet";
import { ReReadable } from "rereadable-stream";
import { IncomingMessage, ServerResponse } from "http";

const MIN_MSG_CODE = 10000;
const OBJ_TYPE_CODE_DELTA = 1000;
const REQ_METHOD_CODE_DELTA = 100;

type AuditData = {
    id: string;
    object?: string;
}
export type AuditedRequest = ParsedMessage & { auditData: AuditData };

export class Auditor {
    auditStream = new StringStream();
    logger = new ObjLogger(this);

    outStream = new ReReadable({ length: 1e5 });

    getOutputStream(req: IncomingMessage, res: ServerResponse) {
        this.logger.info("request", req.url, req.method);

        req.socket.on("end", () => {
            this.logger.info("request close", req.url, req.method);
            res.end();
        });

        this.logger.info("Getting output stream");
        return this.outStream.rewind();
    }

    constructor() {
        this.outStream.rewind().resume();
        this.auditStream.pipe(this.outStream);
    }

    write(msg: OpRecord) {
        this.auditStream.write(JSON.stringify(msg) + "\n");
    }

    /**
     * Calculates the operation code from the request.
     *
     * @param {IncommingMessage} req Request.
     * @returns {number} Operation code. 0 if request should not be audited.
     */
    getOpCode(req: ParsedMessage): OpRecordCode {
        const { type, op } = req.params || {};

        const i = ["sequence", "instance", "topic"].indexOf(type);

        if (i === -1) {
            return 0;
        }

        let code = MIN_MSG_CODE + i * OBJ_TYPE_CODE_DELTA;

        code += (["post", "get", "put", "delete"].indexOf(req.method!.toLowerCase()) + 1) * REQ_METHOD_CODE_DELTA;
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

    auditRequest(req: AuditedRequest, status: OpRecord["opState"]) {
        const opCode = this.getOpCode(req);
        const requestorId = req.headers["x-mw-user"] as string || "system";

        if (opCode) {
            this.write({
                opState: status,
                opCode,
                requestId: req.auditData.id,
                objectId: (req.params || {}).id,
                requestorId,
                rx: req.socket.bytesRead,
                tx: req.socket.bytesWritten,
                receivedAt: Date.now()
            });
        }
    }

    auditInstanceHeartBeat(id: string) {
        this.logger.info("Instance heartbeat", id);
        this.write({
            opState: "ACTIVE",
            opCode: OpRecordCode.HEARTBEAT,
            requestId: "",
            objectId: id,
            requestorId: "system",
            rx: 0,
            tx: 0,
            receivedAt: Date.now()
        });
    }

    auditHostHeartBeat() {
        this.logger.info("Host heartbeat");
        this.write({
            opState: "ACTIVE",
            opCode: OpRecordCode.HEARTBEAT,
            requestId: "",
            objectId: "Host",
            requestorId: "system",
            rx: 0,
            tx: 0,
            receivedAt: Date.now()
        });
    }
}

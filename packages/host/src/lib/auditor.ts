import { ObjLogger } from "@scramjet/obj-logger";
import { InstanceLimits, InstanceStats, OpRecord, ParsedMessage } from "@scramjet/types";
import { InstanceMessageCode, OpRecordCode, SequenceMessageCode } from "@scramjet/symbols";
import { StringStream } from "scramjet";
import { ReReadable } from "rereadable-stream";
import { IncomingMessage, ServerResponse } from "http";

const MIN_MSG_CODE = 10000;
const OBJ_TYPE_CODE_DELTA = 1000;
const REQ_METHOD_CODE_DELTA = 100;

type AuditData = {
    id: string;
    object?: string;
    rx: number;
    tx: number;
    requestorId: string;
}

export type AuditedRequest = ParsedMessage & { auditData: AuditData };

export class Auditor {
    auditStream = new StringStream();
    logger = new ObjLogger(this);

    outStream = new ReReadable({ length: 1e6 });

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
        try {
            this.auditStream.write(JSON.stringify(msg) + "\n");
        } catch (e) {
            this.logger.error("Failed to write audit message", e);
        }
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

        if (!~i) {
            return 0;
        }

        let code = MIN_MSG_CODE + i * OBJ_TYPE_CODE_DELTA;

        // post = 100, get = 200, put = 300, delete = 400
        code += (["post", "get", "put", "delete"].indexOf(req.method!.toLowerCase()) + 1) * REQ_METHOD_CODE_DELTA;

        // stdout 1, stderr 2, stdin 3...
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

    getRequestorId(req?: AuditedRequest): string {
        return req?.auditData.requestorId as string || "system";
    }

    auditRequest(req: AuditedRequest, status: OpRecord["opState"]) {
        const opCode = this.getOpCode(req);
        const requestorId = this.getRequestorId(req);

        this.logger.trace("Requestor, tx, rx", requestorId, req.auditData.rx, req.auditData.tx);

        if (opCode !== OpRecordCode.NOT_PROCESSABLE) {
            this.write({
                opState: status,
                opCode,
                requestId: req.auditData.id,
                objectId: (req.params || {}).id,
                requestorId,
                rx: req.auditData.rx,
                tx: req.auditData.tx,
                receivedAt: Date.now()
            });
        }
    }

    auditInstanceHeartBeat(id: string, lastStats: InstanceStats) {
        this.logger.info("Instance heartbeat", id);
        this.write({
            opState: "ACTIVE",
            opCode: OpRecordCode.INSTANCE_HEARTBEAT,
            objectId: id,
            requestorId: "system",
            receivedAt: Date.now(),
            limits: lastStats.limits
        });
    }

    auditHostHeartBeat() {
        this.logger.info("Host heartbeat");
        this.write({
            opState: "ACTIVE",
            opCode: OpRecordCode.HOST_HEARTBEAT,
            objectId: "",
            requestorId: "system",
            receivedAt: Date.now()
        });
    }

    auditInstance(id: string, state: InstanceMessageCode, req?: AuditedRequest) {
        const requestorId = this.getRequestorId(req);

        this.logger.info("Instance state", id, state);
        this.write({
            opState: "",
            opCode: state,
            objectId: id,
            requestorId: requestorId,
            receivedAt: Date.now()
        });
    }

    auditInstanceStart(id: string, req: AuditedRequest, limits: InstanceLimits) {
        const requestorId = this.getRequestorId(req);

        this.logger.info("Instance started", id);
        this.write({
            opState: "",
            opCode: InstanceMessageCode.INSTANCE_STARTED,
            objectId: id,
            requestorId: requestorId,
            receivedAt: Date.now(),
            limits
        });
    }

    auditSequence(id: string, state: SequenceMessageCode) {
        this.logger.info("Sequence state", id, state);
        this.write({
            opState: "",
            opCode: state,
            objectId: id,
            requestorId: "system",
            receivedAt: Date.now()
        });
    }
}

import { ReReadable } from "rereadable-stream";
import { MultiStream } from "scramjet";
import { ManagerAuditor } from "@scramjet/manager";
import { IncomingMessage } from "http";
import { ObjLogger } from "@scramjet/obj-logger";

export class MultiManagerAuditor {
    private _output = new ReReadable({ length: 1e5 });

    logger = new ObjLogger(this);

    managerAuditors: ManagerAuditor[] = [];
    auditMultiStream = new MultiStream([]);
    requests: IncomingMessage[] = [];

    get output() {
        return this._output.rewind();
    }

    constructor() {
        this._output.rewind().resume();
        this.auditMultiStream.mux().pipe(this._output);
    }

    attach(managerAuditor: ManagerAuditor) {
        this.managerAuditors.push(managerAuditor);
        this.auditMultiStream.add(
            managerAuditor.auditStream.toStringStream().JSONParse().each((e) => {
                e.mId = managerAuditor.managerId;
            }).JSONStringify().catch((err: any) => {
                this.logger.error("Can't process audit entry", err);
            })
        );
    }

    async onAuditRequest(req: IncomingMessage) {
        this.requests.push(req);

        req.on("close", () => this.onAuditRequestEnd(req));

        await Promise.all(this.managerAuditors.map((ma) => ma.setFlowing(true)));
    }

    async onAuditRequestEnd(req: IncomingMessage) {
        this.logger.debug("Audit request ended");
        this.requests.splice(this.requests.indexOf(req), 1);

        if (!this.requests.length) {
            this.logger.debug("No more outgoing Audit requests");

            await Promise.all(this.managerAuditors.map(ma => ma.setFlowing(false)));
        }
    }
}

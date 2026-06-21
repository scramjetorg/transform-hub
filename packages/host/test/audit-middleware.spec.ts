import test from "ava";
import { EventEmitter } from "events";
import { PassThrough } from "stream";

import { auditMiddleware } from "../src/lib/middlewares/audit";

test("audit middleware tolerates requests without sockets", t => {
    const req = new PassThrough() as any;
    const res = new EventEmitter() as any;
    const records: any[] = [];
    const auditor = {
        auditRequest(request: any, status: string) {
            records.push({
                status,
                rx: request.auditData.rx,
                tx: request.auditData.tx
            });
        }
    };
    let nextCalled = false;

    req.headers = {};
    req.params = { type: "sequence", id: "seq-1" };
    req.method = "GET";

    t.notThrows(() => auditMiddleware(auditor as any)(req, res, () => {
        nextCalled = true;
    }));

    req.emit("end");
    res.emit("finish");

    t.true(nextCalled);
    t.deepEqual(records[0], { status: "START", rx: 0, tx: 0 });
});

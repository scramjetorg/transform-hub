import { RunnerMessageCode } from "@scramjet/symbols";
import test from "ava";

import { getRouter } from "@scramjet/api-server";
import { getCommunicationHandler } from "./lib/get-communcation-handler";

test("get registers resolver and monitoring routes", t => {
    const api = getRouter();
    const { comm } = getCommunicationHandler();

    t.notThrows(() => {
        api.get("/api/resolver", () => ({ ok: true }));
        api.get("/api/monitoring", RunnerMessageCode.MONITORING, comm);
    });
});

test("op registers supported method routes", t => {
    const api = getRouter();
    const { comm } = getCommunicationHandler();

    t.notThrows(() => {
        api.op("post", "/api/post", () => ({ opStatus: "OK" }));
        api.op("put", "/api/put", () => ({ opStatus: "OK" }));
        api.op("patch", "/api/patch", () => ({ opStatus: "OK" }));
        api.op("delete", "/api/delete", RunnerMessageCode.KILL, comm);
    });
});

test("op rejects unsupported methods when registering", t => {
    const api = getRouter();

    t.throws(() => api.op("head", "/api/head", () => ({ opStatus: "OK" })), {
        message: "ERR_UNSUPPORTED_METHOD"
    });
});

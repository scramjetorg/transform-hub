import test from "ava";
import { EventEmitter } from "events";
import { parseCliOptions } from "@scramjet/config";
import { logManagerGatewayRequest, logManagerVerser2RequestFailure, MultiManager } from "../src/lib/multi-manager";
import { MultiManagerConfig, multiManagerCliOptions } from "../src/config/multi-manager-configuration";

test("MultiManager API-server log consumption defaults enabled and honors log.apiServers", t => {
    t.true(MultiManager.shouldConsumeApiServerLogs({} as any));
    t.true(MultiManager.shouldConsumeApiServerLogs({ log: { apiServers: true } }));
    t.false(MultiManager.shouldConsumeApiServerLogs({ log: { apiServers: false } }));
});

test("MultiManager executable option reaches its config and consumer", t => {
    const enabled = parseCliOptions({ argv: ["node", "multi-manager", "--log-api-servers"], options: multiManagerCliOptions as any });
    const disabled = parseCliOptions({ argv: ["node", "multi-manager", "--no-log-api-servers"], options: multiManagerCliOptions as any });

    const base = { colors: true, logLevel: "TRACE", dumpHeap: 0, s3AccessKeyId: "", s3SecretAccessKey: "" } as any;
    const enabledConfig = new MultiManagerConfig({ ...base, logApiServers: enabled.logApiServers });
    const disabledConfig = new MultiManagerConfig({ ...base, logApiServers: disabled.logApiServers });

    t.true(MultiManager.shouldConsumeApiServerLogs(enabledConfig));
    t.false(MultiManager.shouldConsumeApiServerLogs(disabledConfig));
});


test("MultiManager logs structured direct Manager Verser2 request failures", t => {
    const calls: Array<{ message: string; details: Record<string, unknown> }> = [];
    const cause = new Error("route unavailable");
    const error = new Error("reverse request failed") as Error & { cause?: unknown };
    error.cause = cause;
    error.name = "Verser2RouteUnavailableError";

    logManagerVerser2RequestFailure(
        { error: (message, details) => calls.push({ message, details }) },
        "e2e-manager",
        { method: "POST", url: "/api/v1/sth?token=secret#fragment" },
        error,
    );

    t.is(calls.length, 1);
    t.is(calls[0].message, "Manager Verser2 request failed");
    t.deepEqual(calls[0].details, {
        managerId: "e2e-manager",
        method: "POST",
        url: "/api/v1/sth",
        error: {
            name: "Verser2RouteUnavailableError",
            message: "reverse request failed",
            stack: error.stack,
            cause: { name: "Error", message: "route unavailable", stack: cause.stack }
        }
    });
});

test("MultiManager does not evaluate arbitrary object causes", t => {
    const calls: Array<{ message: string; details: Record<string, unknown> }> = [];
    let toStringEvaluated = false;
    const error = new Error("reverse request failed") as Error & { cause?: unknown };
    error.cause = {
        toString: () => {
            toStringEvaluated = true;
            return "secret-token";
        }
    };

    logManagerVerser2RequestFailure(
        { error: (message, details) => calls.push({ message, details }) },
        "e2e-manager",
        { method: "GET", url: "/api/v1/sth?accessKey=secret#fragment" },
        error,
    );

    t.false(toStringEvaluated);
    t.deepEqual((calls[0].details.error as any).cause, { causeType: "object" });
    t.notRegex(JSON.stringify(calls[0].details), /secret-token|accessKey/);
});

test("MultiManager omits primitive cause values", t => {
    for (const cause of ["secret-token", Symbol("secret-symbol")]) {
        const calls: Array<{ message: string; details: Record<string, unknown> }> = [];
        const error = new Error("reverse request failed") as Error & { cause?: unknown };
        error.cause = cause;

        logManagerVerser2RequestFailure(
            { error: (message, details) => calls.push({ message, details }) },
            "e2e-manager",
            { method: "GET", url: "/api/v1/sth" },
            error,
        );

        const errorDetails = calls[0].details.error as any;
        t.deepEqual(errorDetails.cause, { causeType: typeof cause });
        t.notRegex(JSON.stringify(errorDetails), /secret-token|secret-symbol/);
    }
});

test("MultiManager gateway logs a 500 response without a thrown dispatch error", t => {
    const calls: Array<{ level: string; message: string; details: Record<string, unknown> }> = [];
    const response = Object.assign(new EventEmitter(), { statusCode: 500 });
    const logger = {
        debug: (message: string, details: Record<string, unknown>) => calls.push({ level: "debug", message, details }),
        error: (message: string, details: Record<string, unknown>) => calls.push({ level: "error", message, details })
    };

    logManagerGatewayRequest(logger, "gateway-manager", { method: "POST", url: "/api/v1/sth?token=secret#fragment" }, response, () => {
        response.emit("finish");
    });

    t.is(calls[0].message, "Manager gateway request");
    t.is(calls[0].details.path, "/api/v1/sth");
    t.is(calls[1].message, "Manager gateway response failed");
    t.is(calls[1].details.status, 500);
    t.is(calls[2].message, "Manager gateway request completed");
    t.is(calls[2].details.status, 500);
});

test("MultiManager gateway logs thrown dispatch errors and suppresses normal debug when disabled", t => {
    const calls: Array<{ level: string; message: string; details: Record<string, unknown> }> = [];
    const logger = {
        debug: (message: string, details: Record<string, unknown>) => calls.push({ level: "debug", message, details }),
        error: (message: string, details: Record<string, unknown>) => calls.push({ level: "error", message, details })
    };
    const failure = new Error("dispatch failed");
    t.throws(() => logManagerGatewayRequest(logger, "gateway-manager", { method: "GET", url: "/api/v1/sth?secret=ignored" }, new EventEmitter() as any, () => {
        throw failure;
    }, false));

    t.deepEqual(calls.map(call => call.message), ["Manager gateway dispatch failed"]);
    t.is(calls[0].details.path, "/api/v1/sth");
    t.is((calls[0].details.error as any).message, "dispatch failed");
});

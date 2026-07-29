import test from "ava";
import { EventEmitter } from "events";

import { addManagerRouterLogging, Manager } from "../src/lib/manager";

function response(): EventEmitter & { statusCode: number } {
    return Object.assign(new EventEmitter(), { statusCode: 500 });
}

test.serial("Manager router logging records direct lookup failure and completion", async t => {
    const records: Array<{ level: string; message: string; details: Record<string, unknown> }> = [];
    const cause = new Error("route unavailable");
    const failure = new Error("registration reverse request failed") as Error & { cause?: unknown };
    failure.name = "Verser2RouteUnavailableError";
    failure.cause = cause;
    const router = {
        lookup: (_request: unknown, _response: unknown, next: (error?: Error) => void) => next(failure)
    };
    const logger = {
        debug: (message: string, details: Record<string, unknown>) => records.push({ level: "debug", message, details }),
        error: (message: string, details: Record<string, unknown>) => records.push({ level: "error", message, details })
    };
    const res = response();
    const wrapped = addManagerRouterLogging(router as any, "e2e-manager", logger);

    wrapped.lookup({ method: "POST", url: "/api/v1/sth?ignored=secret", headers: { "x-scramjet-route-domain": "sth.hub.scramjet.internal" } } as any, res as any, () => {
        res.emit("finish");
    });

    t.is(records.length, 3);
    t.is(records[0].message, "Manager API request");
    t.is(records[0].details.path, "/api/v1/sth");
    t.is(records[1].message, "Manager API request failed");
    t.like(records[1].details, {
        managerId: "e2e-manager",
        method: "POST",
        path: "/api/v1/sth",
        routeDomain: "sth.hub.scramjet.internal",
        status: 500,
        error: {
            name: "Verser2RouteUnavailableError",
            message: "registration reverse request failed",
            cause: { name: "Error", message: "route unavailable" }
        }
    });
    t.is(records[2].message, "Manager API request completed");
    t.is(records[2].details.status, 500);
    t.truthy(records[2].details.durationMs);
});

test.serial("Manager router logging preserves unmatched-route next behavior", t => {
    const records: string[] = [];
    const router = {
        lookup: (_request: unknown, _response: unknown, next: (error?: Error) => void) => next()
    };
    const wrapped = addManagerRouterLogging(router as any, "manager", {
        debug: message => records.push(String(message)),
        error: () => records.push("error")
    });
    let nextCalled = false;

    wrapped.lookup({ method: "GET", url: "/missing", headers: {} } as any, response() as any, error => {
        nextCalled = error === undefined;
    });

    t.true(nextCalled);
    t.deepEqual(records, ["Manager API request"]);
});

test.serial("Manager router logging suppresses normal debug records but keeps failures", t => {
    const records: string[] = [];
    const router = {
        lookup: (_request: unknown, _response: unknown, next: (error?: Error) => void) => next(new Error("handler failed"))
    };
    const wrapped = addManagerRouterLogging(router as any, "manager", {
        debug: message => records.push(`debug:${String(message)}`),
        error: message => records.push(`error:${String(message)}`)
    }, false);

    wrapped.lookup({ method: "POST", url: "/api/v1/sth?token=secret#fragment", headers: {} } as any, response() as any, () => {});

    t.deepEqual(records, ["error:Manager API request failed"]);
});

test.serial("Manager router logging strips target-path queries and excludes object causes", t => {
    const records: Array<{ message: string; details: Record<string, unknown> }> = [];
    let toStringEvaluated = false;
    const cause = {
        toString: () => {
            toStringEvaluated = true;
            return "secret-token";
        }
    };
    const failure = new Error("handler failed") as Error & { cause?: unknown };
    failure.cause = cause;
    const router = {
        lookup: (_request: unknown, _response: unknown, next: (error?: Error) => void) => next(failure)
    };
    const wrapped = addManagerRouterLogging(router as any, "manager", {
        debug: (message, details) => records.push({ message: String(message), details: details as Record<string, unknown> }),
        error: (message, details) => records.push({ message: String(message), details: details as Record<string, unknown> })
    });
    const res = response();

    wrapped.lookup({
        method: "GET",
        url: "/api/v1/sth?secret=ignored#fragment",
        headers: { "x-scramjet-route-target-path": "/api/v1/platform?secret=ignored#fragment" }
    } as any, res as any, () => res.emit("finish"));

    const failureRecord = records.find(record => record.message === "Manager API request failed")!;
    t.is(failureRecord.details.path, "/api/v1/sth");
    t.is(failureRecord.details.targetPath, "/api/v1/platform");
    t.deepEqual((failureRecord.details.error as any).cause, { causeType: "object" });
    t.false(toStringEvaluated);
});

test.serial("Manager router logging omits primitive cause values", t => {
    for (const cause of ["secret-token", Symbol("secret-symbol")]) {
        const records: Array<{ message: string; details: Record<string, unknown> }> = [];
        const failure = new Error("handler failed") as Error & { cause?: unknown };
        failure.cause = cause;
        const router = {
            lookup: (_request: unknown, _response: unknown, next: (error?: Error) => void) => next(failure)
        };
        const wrapped = addManagerRouterLogging(router as any, "manager", {
            debug: (message, details) => records.push({ message: String(message), details: details as Record<string, unknown> }),
            error: (message, details) => records.push({ message: String(message), details: details as Record<string, unknown> })
        });

        wrapped.lookup({ method: "GET", url: "/api/v1/sth", headers: {} } as any, response() as any, () => {});

        const errorDetails = records.find(record => record.message === "Manager API request failed")!.details.error as any;
        t.deepEqual(errorDetails.cause, { causeType: typeof cause });
        t.notRegex(JSON.stringify(errorDetails), /secret-token|secret-symbol/);
    }
});

test.serial("Manager router logs real Cero handler failures with a sanitized path", t => {
    const records: Array<{ level: string; message: string; details: Record<string, unknown> }> = [];
    const manager = new Manager({ id: "router-error-manager" } as any);
    (manager as any).logger = {
        debug: (message: string, details: Record<string, unknown>) => records.push({ level: "debug", message, details }),
        error: (message: string, details: Record<string, unknown>) => records.push({ level: "error", message, details })
    };
    manager.router.get("/api/v1/failing", () => {
        throw new Error("handler secret should remain bounded metadata only");
    });
    const response = Object.assign(new EventEmitter(), {
        headersSent: false,
        writableEnded: false,
        statusCode: 200,
        writeHead(status: number) {
            this.statusCode = status;
            this.headersSent = true;
        },
        end() {
            this.writableEnded = true;
            (this as any).emit("finish");
        }
    }) as any;

    manager.router.lookup({ method: "GET", url: "/api/v1/failing?token=secret#fragment", headers: {} } as any, response as any, () => {});

    const failure = records.find(record => record.message === "Manager API handler failed")!;
    t.is(failure.level, "error");
    t.is(failure.details.managerId, "router-error-manager");
    t.is(failure.details.path, "/api/v1/failing");
    t.is(failure.details.status, 500);
    t.is((failure.details.error as any).name, "Error");
    t.notRegex(JSON.stringify(failure.details), /token=secret|fragment/);
    t.true(response.writableEnded);
});

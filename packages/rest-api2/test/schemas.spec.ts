import test from "ava";
import { RestAPI2Routes, getRestAPI2Route, healthCheckInfo, MultiManager } from "../src";

// ============================================================
// Assertion (1): host hubRouter /sequences response schema
// ============================================================
test("host hubRouter /sequences response accepts items with id/status and rejects item missing id", t => {
    const route = getRestAPI2Route(RestAPI2Routes.host.hubRouter(), "get", "/sequences");
    const schema = route.schemas!.response!;

    // Accepts items with id and status
    const valid = schema.safeParse({ items: [{ id: "seq-1", status: "running" }] });
    t.true(valid.success, "should accept item with id and status");

    // Accepts items with only id (status is optional)
    const minimal = schema.safeParse({ items: [{ id: "seq-2" }] });
    t.true(minimal.success, "should accept item with only id");

    // Rejects items missing id
    const invalid = schema.safeParse({ items: [{ status: "running" }] });
    t.false(invalid.success, "should reject item missing id");
});

// ============================================================
// Assertion (2): manager router /hubs response schema
// ============================================================
test("manager /hubs response schema is not unknown and rejects invalid list item", t => {
    const route = getRestAPI2Route(RestAPI2Routes.manager.router("/api/v2"), "get", "/hubs");
    const schema = route.schemas!.response!;

    // Not unknown: rejects completely invalid data (empty object lacks `items`)
    const empty = schema.safeParse({});
    t.false(empty.success, "should reject empty object – proves schema is not passthrough unknown");

    // Rejects item missing required id
    const invalid = schema.safeParse({ items: [{ status: "online" }] });
    t.false(invalid.success, "should reject list item missing id");

    // Accepts valid list
    const valid = schema.safeParse({ items: [{ id: "hub-1", status: "online" }] });
    t.true(valid.success, "should accept valid hub list");
});

// ============================================================
// Assertion (2): manager router /instances response schema
// ============================================================
test("manager /instances response schema is not unknown and rejects invalid list item", t => {
    const route = getRestAPI2Route(RestAPI2Routes.manager.router("/api/v2"), "get", "/instances");
    const schema = route.schemas!.response!;

    // Not unknown: rejects empty object
    const empty = schema.safeParse({});
    t.false(empty.success, "should reject empty object – proves schema is not passthrough unknown");

    // Rejects item missing required id
    const invalid = schema.safeParse({ items: [{ sequenceId: "seq-1" }] });
    t.false(invalid.success, "should reject list item missing id");

    // Accepts valid list
    const valid = schema.safeParse({ items: [{ id: "inst-1", sequenceId: "seq-1", status: "running" }] });
    t.true(valid.success, "should accept valid instance list");
});

// ============================================================
// Assertion (3): instance router GET /stdio response
// ============================================================
test("instance GET /stdio response accepts channels with fd 0/1/2 and rejects fd 3", t => {
    const route = getRestAPI2Route(RestAPI2Routes.instance.router(), "get", "/stdio");
    const schema = route.schemas!.response!;

    // Each accepted fd individually
    for (const fd of [0, 1, 2]) {
        const result = schema.safeParse({ channels: [{ fd, readable: true, writable: false }] });
        t.true(result.success, `should accept fd ${fd}`);
    }

    // All three together
    const all = schema.safeParse({
        channels: [
            { fd: 0, readable: true, writable: false },
            { fd: 1, readable: true, writable: true },
            { fd: 2, readable: false, writable: true }
        ]
    });
    t.true(all.success, "should accept all three fds together");

    // Rejects fd 3
    const fd3 = schema.safeParse({ channels: [{ fd: 3, readable: true, writable: false }] });
    t.false(fd3.success, "should reject fd 3");
});

// ============================================================
// Assertion (4): GET /stdio/:fd params
// ============================================================
test("GET /stdio/:fd params accepts fd '1' and '2' but rejects '0' and '3'", t => {
    const route = getRestAPI2Route(RestAPI2Routes.instance.router(), "get", "/stdio/:fd");
    const schema = route.schemas!.params!;

    // Accepts '1' (coerced to number 1)
    const fd1 = schema.safeParse({ fd: "1" });
    t.true(fd1.success, "should accept fd '1'");
    if (fd1.success) t.is(fd1.data.fd as unknown as number, 1, "should coerce '1' to 1");

    // Accepts '2'
    const fd2 = schema.safeParse({ fd: "2" });
    t.true(fd2.success, "should accept fd '2'");
    if (fd2.success) t.is(fd2.data.fd as unknown as number, 2, "should coerce '2' to 2");

    // Rejects '0'
    const fd0 = schema.safeParse({ fd: "0" });
    t.false(fd0.success, "should reject fd '0'");

    // Rejects '3'
    const fd3 = schema.safeParse({ fd: "3" });
    t.false(fd3.success, "should reject fd '3'");
});

// ============================================================
// Assertion (5): PUT /stdio/:fd params
// ============================================================
test("PUT /stdio/:fd params accepts fd '0' but rejects '1' and '2'", t => {
    const route = getRestAPI2Route(RestAPI2Routes.instance.router(), "put", "/stdio/:fd");
    const schema = route.schemas!.params!;

    // Accepts '0'
    const fd0 = schema.safeParse({ fd: "0" });
    t.true(fd0.success, "should accept fd '0'");
    if (fd0.success) t.is(fd0.data.fd as unknown as number, 0, "should coerce '0' to 0");

    // Rejects '1'
    const fd1 = schema.safeParse({ fd: "1" });
    t.false(fd1.success, "should reject fd '1'");

    // Rejects '2'
    const fd2 = schema.safeParse({ fd: "2" });
    t.false(fd2.success, "should reject fd '2'");
});

// ============================================================
// Assertion (6): instance DELETE / operation response
// ============================================================
test("instance DELETE / operation response validates operation/result shape", t => {
    const route = getRestAPI2Route(RestAPI2Routes.instance.router(), "delete", "/");
    const schema = route.schemas!.response!;

    // Valid full response with operation and result
    const full = schema.safeParse({
        operation: { id: "op-1", status: "completed" },
        result: { instanceId: "inst-1", mode: "kill", accepted: true }
    });
    t.true(full.success, "should accept valid full response with operation and result");

    // Valid response with only operation (result is optional)
    const minimal = schema.safeParse({
        operation: { id: "op-2", status: "pending" }
    });
    t.true(minimal.success, "should accept response with only operation");

    // All valid operation statuses
    for (const status of ["pending", "running", "completed", "failed"]) {
        const op = schema.safeParse({ operation: { id: "op", status } });
        t.true(op.success, `should accept operation status "${status}"`);
    }

    // Missing operation
    const noOp = schema.safeParse({ result: { instanceId: "inst-1", mode: "kill", accepted: true } });
    t.false(noOp.success, "should reject response missing operation");

    // Operation missing id
    const noOpId = schema.safeParse({ operation: { status: "completed" } });
    t.false(noOpId.success, "should reject operation missing id");

    // Invalid operation status
    const badStatus = schema.safeParse({ operation: { id: "op-3", status: "unknown" } });
    t.false(badStatus.success, "should reject operation with invalid status");

    // Invalid result mode
    const badMode = schema.safeParse({
        operation: { id: "op-4", status: "completed" },
        result: { instanceId: "inst-1", mode: "pause", accepted: true }
    });
    t.false(badMode.success, "should reject result with invalid mode");

    // Result missing instanceId
    const noInstId = schema.safeParse({
        operation: { id: "op-5", status: "completed" },
        result: { mode: "stop", accepted: true }
    });
    t.false(noInstId.success, "should reject result missing instanceId");
});

test("healthCheckInfo schema requires typed components for the selected scope", t => {
    const schema = healthCheckInfo(MultiManager);

    t.true(schema.safeParse({
        scope: { id: "mmgr-1", apiBase: "/api/v2", managers: 1 },
        healthy: true,
        status: "healthy",
        components: [{ name: "child", healthy: true, status: "healthy", scope: { id: "child-mmgr", apiBase: "/api/v2/managers/child" } }]
    }).success);
    t.true(schema.safeParse({
        scope: { id: "mmgr-1", apiBase: "/api/v2" },
        healthy: true,
        status: "degraded",
        components: []
    }).success);
    t.false(schema.safeParse({
        scope: { id: "mmgr-1", apiBase: "/api/v2" },
        status: "healthy",
        healthy: true
    }).success, "should require components array");
    t.false(schema.safeParse({
        scope: { id: "mmgr-1", apiBase: "/api/v2" },
        healthy: true,
        status: "healthy",
        components: [{ name: "child", healthy: true, status: "healthy", scope: { id: "missing-api-base" } }]
    }).success, "should reject component items that do not match the selected scope schema");
});

test("manager inventory hub DELETE query parses true and false strings", t => {
    const route = getRestAPI2Route(RestAPI2Routes.manager.router("/api/v2"), "delete", "/inventory/hubs/:hubId");
    const schema = route.schemas!.query!;
    const parsedFalse = schema.safeParse({ delete: "false", force: "0" });
    const parsedTrue = schema.safeParse({ delete: "true", force: "1" });

    t.true(parsedFalse.success);
    if (parsedFalse.success) t.deepEqual(parsedFalse.data, { delete: false, force: false });
    t.true(parsedTrue.success);
    if (parsedTrue.success) t.deepEqual(parsedTrue.data, { delete: true, force: true });
    t.false(schema.safeParse({ delete: "not-a-boolean" }).success);
});

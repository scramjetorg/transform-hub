# Testing Hub And Context Behavior

Use `createHubHarness()` when a sequence needs a realistic in-memory `this.hub` and app context without starting a full Scramjet Transform Hub, Docker adapter, Kubernetes adapter, or BDD workflow.

The harness is intended for sequence behavior tests. It records Hub/API calls, context interactions, lifecycle actions, events, local storage, logging, exposed API registration, and minimal `this.space` calls in deterministic timelines.

```ts
import path from "node:path";
import test from "ava";
import { createHubHarness, runSequence } from "@scramjet/sequence-test";

test("asserts ordered Hub and context behavior", async t => {
  const harness = createHubHarness({
    streamDefaults: {
      rpc: "rpc-stream",
      topic: "topic-stream"
    }
  });

  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/ordered-behavior/index.js"),
    context: harness.context,
    input: {
      contentType: "application/x-ndjson",
      body: [{ id: "ordered-1" }]
    }
  });

  harness.assert.order([
    { method: "POST", path: "/api/v1/topics" },
    { method: "POST", path: "/api/v1/topics/ordered-behavior-topic" },
    { method: "GET", path: "/api/v1/version" },
    { method: "POST", path: "/api/v1/rpc/ordered" }
  ]);

  t.deepEqual(harness.events().map(entry => `${entry.scope}:${entry.name}`), [
    "host:item.processed",
    "space:item.processed"
  ]);
  t.deepEqual(harness.storage().map(entry => entry.action), ["setItem", "getItem", "removeItem"]);
  t.deepEqual(harness.logs().map(entry => entry.level), ["info"]);
  t.is(harness.apiRoutes()[0].path, "/health");
  t.notThrows(() => result.assert.completed());
});
```

## Covered Hub APIs

The harness provides deterministic defaults and call recording for:

- host metadata: version, status, config, and load-check;
- sequence and instance operations: list, send/upload, get, delete, start, list instances, and instance info;
- topics: create, list, delete, send, get, named/topic data, and readable stream responses;
- RPC: host-level and instance-level RPC paths, including streamed request capture and readable stream responses.

Each Hub call is recorded in `harness.calls()` with a monotonic `sequence`, normalized `method`, normalized `path`, request `body`, headers, and response metadata.

## Covered Context APIs

`harness.context` exposes AppContext-compatible test behavior for:

- lifecycle: `keepAlive()`, `end()`, and `destroy()` via `harness.lifecycle()`;
- events: `emit()` and `emitToSpace()` via `harness.events()`;
- local storage: `getItem`, `setItem`, `removeItem`, and `clear` via `harness.storage()` and `harness.localStorageEntries()`;
- logging: `trace`, `debug`, `info`, `warn`, and `error` via `harness.logs()`;
- exposed API registration: `this.api.use(path, handler)` via `harness.apiRoutes()`;
- minimal `this.space` calls via `harness.spaceCalls()`.

Detailed `this.space` behavior remains intentionally minimal and non-production-parity.

## Package Metadata And Runtime Resolution

Package-backed fixtures can use `resolveSequenceFixtureMetadata(directory)` to validate `package.json` metadata before running a sequence fixture:

- `package.json.main` is required, must stay inside the fixture directory, and must resolve to an existing file;
- missing `engines` defaults to Node-compatible metadata;
- multi-engine metadata uses Node-first precedence (`node` before `bun` before `python3`), matching runtime selection behavior;
- invalid engines metadata fails clearly.

## Limitations

- The package is **supported** for scoped local sequence fixture and hub-harness validation. It is **not** a full live Hub/process/Docker/Kubernetes parity replacement.
- It does not replace package unit tests, BDD tests, adapter tests, runtime invariant checks, or full runner-protocol validation.
- It does not start a real Transform Hub, Docker adapter, Kubernetes adapter, or BDD workflow.
- `runSequence()` currently executes the direct Node fixture path; Python and Bun support is limited to runner planning in this package.

# @scramjet/sequence-test

Test-runner-agnostic helpers for exercising Scramjet Transform Sequences without starting a full Scramjet Transform Hub.

## Testing with AVA

`@scramjet/sequence-test` is intended for AVA tests authored in Node.js. TypeScript tests should load `ts-node/register` or use the project’s normal TypeScript test setup.

Example AVA config:

```json
{
  "ava": {
    "extensions": ["ts"],
    "files": ["test/**/*.spec.ts"],
    "require": ["ts-node/register"]
  }
}
```

Import helpers from the package:

```ts
import test from "ava";
import {
  runSequence,
  createSequenceTest,
  createInputDriver,
  createSequenceRequestClient,
  createSequenceRequestClientFromMonitoring,
  createHubMock,
  createRunnerEnv,
  createRunnerLaunchPlan,
  createFakeInstancesServer
} from "@scramjet/sequence-test";
```

## One-shot Node sequence test

`runSequence()` is the shortest path for simple Node fixtures. In the current implementation it loads the Node module directly, calls the exported function with `input.body`, captures returned records as NDJSON, and records a completion frame.

```ts
import path from "node:path";
import test from "ava";
import { runSequence } from "@scramjet/sequence-test";

test("maps NDJSON input", async t => {
  const result = await runSequence({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/map-ndjson/index.js"),
    input: {
      contentType: "application/x-ndjson",
      body: [
        { id: 1, value: 2 },
        { id: 2, value: 3 }
      ]
    }
  });

  t.deepEqual(result.output.ndjson(), [
    { id: 1, value: 4 },
    { id: 2, value: 6 }
  ]);

  t.notThrows(() => result.assert.completed());
  t.notThrows(() => result.assert.noRuntimeErrors());
});
```

Current limitation: `runtime: "python"` and `runtime: "bun"` are accepted by the shared option shape, but `runSequence()` only executes the direct Node path today.

## Interactive harness

`createSequenceTest()` returns a harness-shaped object with lifecycle methods and in-memory captures. In the current phase it does not spawn the full runner by itself; tests can use it to exercise capture/assertion behavior or compose lower-level runner helpers.

```ts
import path from "node:path";
import test from "ava";
import { RunnerMessageCode } from "@scramjet/symbols";
import { createSequenceTest } from "@scramjet/sequence-test";

test("interactive capture assertions", async t => {
  const harness = await createSequenceTest({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/map-ndjson/index.js")
  });

  try {
    await harness.start();
    await harness.output.write(`${JSON.stringify({ id: 1, value: 4 })}\n`);
    await harness.logs.write("sequence started\n");
    await harness.monitoring.write(`${JSON.stringify([RunnerMessageCode.SEQUENCE_COMPLETED, {}])}\r\n`);
    await harness.monitoring.waitForCompletion();

    t.deepEqual(harness.output.ndjson(), [{ id: 1, value: 4 }]);
    t.deepEqual(harness.logs.lines(), ["sequence started"]);
    t.notThrows(() => harness.assert.completed());
    t.notThrows(() => harness.assert.noRuntimeErrors());
  } finally {
    await harness.close();
  }
});
```

## Input driver

Use `createInputDriver()` when a test needs to write runner-style input headers and payloads to a writable stream.

```ts
import { PassThrough } from "node:stream";
import test from "ava";
import { createInputDriver } from "@scramjet/sequence-test";

test("writes NDJSON input payload", async t => {
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  stream.on("data", chunk => chunks.push(Buffer.from(chunk)));

  const input = createInputDriver(stream);

  await input.ndjson([{ a: 1 }, { b: 2 }]);
  await input.end();

  const payload = Buffer.concat(chunks).toString("utf8");

  t.true(payload.startsWith("content-type: application/x-ndjson\r\n\r\n"));
  t.true(payload.includes(JSON.stringify({ a: 1 })));
  t.true(payload.includes(JSON.stringify({ b: 2 })));
});
```

## Sequence-exposed API requests

`createSequenceRequestClient()` is a small HTTP client for tests that already know the exposed host and port. It does not start an exposed API server.

```ts
import test from "ava";
import { createSequenceRequestClient } from "@scramjet/sequence-test";

test("requests exposed endpoint", async t => {
  const client = createSequenceRequestClient({ host: "127.0.0.1", port: 3000 });
  const response = await client.get("/health");

  t.is(response.status, 200);
});
```

When a monitoring frame contains `payload.exposeHost` and `payload.exposePort`, the client can be created from that frame:

```ts
import { RunnerMessageCode } from "@scramjet/symbols";
import { createSequenceRequestClientFromMonitoring } from "@scramjet/sequence-test";

const monitoringFrame = [
  RunnerMessageCode.PING,
  { payload: { exposeHost: "127.0.0.1", exposePort: 3000 } }
] as const;

const client = createSequenceRequestClientFromMonitoring(monitoringFrame);
const response = await client.post("/items", { id: 1 });
```

## Mocking Hub calls

`createHubMock()` is an explicit route table for tests. Register only the Hub endpoints the sequence is expected to call. Unknown routes return `404`.

```ts
import test from "ava";
import { createHubMock } from "@scramjet/sequence-test";

test("captures expected Hub request", async t => {
  const hub = createHubMock();

  hub.get("/api/v1/version").reply(200, { version: "test" });
  hub.post("/api/v1/events").reply(202, { accepted: true });

  const version = await hub.handle({ method: "GET", path: "/api/v1/version", headers: {} });

  t.is(version.status, 200);
  t.deepEqual(await version.json(), { version: "test" });

  await hub.handle({
    method: "POST",
    path: "/api/v1/events",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "created" })
  });

  await hub.assert.called("POST", "/api/v1/events");
  t.deepEqual(hub.requests()[1].body, { type: "created" });
});
```

The mock is not a fake Transform Hub and is not connected automatically to a running sequence. Tests should call `hub.handle()` directly or wire it into their own transport.

## Runner protocol helpers

Advanced tests can build runner-compatible environment variables and launch plans without starting STH, Docker, or Kubernetes adapters.

```ts
import path from "node:path";
import test from "ava";
import { createRunnerEnv, createRunnerLaunchPlan, createFakeInstancesServer } from "@scramjet/sequence-test";

test.serial("builds runner launch plan", async t => {
  const instanceId = "12345678-1234-1234-1234-123456789012";
  const server = await createFakeInstancesServer(instanceId);

  try {
    const sequencePath = path.resolve(__dirname, "fixtures/map-ndjson/index.js");
    const env = createRunnerEnv({
      runtime: "node",
      sequencePath,
      instanceId,
      sequenceId: instanceId,
      instancesServer: { host: "127.0.0.1", port: server.port }
    });
    const plan = createRunnerLaunchPlan({
      runtime: "node",
      sequencePath,
      instanceId,
      sequenceId: instanceId,
      instancesServer: { host: "127.0.0.1", port: server.port }
    });

    t.is(env.SEQUENCE_PATH, sequencePath);
    t.true(plan.entry.includes("start-runner"));
    t.is(plan.stdio[4], "pipe");
    t.is(plan.stdio[5], "pipe");
  } finally {
    await server.close();
  }
});
```

Use `try/finally` around harnesses, fake servers, local HTTP servers, and spawned processes. `monitoring.waitForCompletion()` resolves only after a `SEQUENCE_COMPLETED` frame is captured.

## Hub mock limitations

The current Hub mock is intentionally a minimal explicit route table. It supports registering expected routes, returning configured responses, capturing requests, and asserting that a request was made. Unknown routes return `404` by default.

Runtime support is intentionally explicit:

- **Node**: first-class target for outbound Hub request mocking because the Node runtime owns the `REQUESTS` channel and uses BPMux-backed HTTP transport in hosted mode.
- **Python**: input/output and lifecycle testing can be driven from Node-authored tests, but outbound Hub mocking depends on Python runtime support for the same request transport. Missing support should be reported clearly instead of hidden.
- **Bun**: hosted Bun currently delegates through the Node runtime path when host channels are configured. Tests must not claim true Bun-hosted Hub mocking parity unless the runtime path supports it directly.

The mock is not a fake STH. It should not grow broad default STH behavior; tests should register only the endpoints they expect a sequence to call.

## Python and Bun runner-env support

Python and Bun tests are authored from Node tests. The harness maps `runtime: "python"` and `runtime: "bun"` to `SequenceInfo.config.engines` and lets the existing `@scramjet/runner` executor selection decide how to launch runtime wrappers.

Local tooling requirements are explicit:

- Python scenarios require the Python runtime wrapper and local Python tooling to be available when execution tests are enabled.
- Bun scenarios require Bun tooling only for execution paths that actually run Bun.
- Hosted Bun behavior may delegate through the Node runtime path while host channels are configured. Tests that require strict Bun execution should check and report delegation clearly instead of silently claiming parity.

Package tests that only verify runner environment generation do not require Python or Bun binaries and should not start a full STH, Docker adapter, or Kubernetes adapter.

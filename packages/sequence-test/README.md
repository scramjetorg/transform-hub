# @scramjet/sequence-test

AVA-friendly helpers for testing Scramjet Transform Sequences from the sequence developer's point of view.

The package is for tests that ask questions like:

- Does my sequence map input records correctly?
- Does my sequence use app context as expected?
- Does my sequence call the Hub endpoints I expect?
- Does my sequence emit events, use local storage, log details, call RPC/topics, or expose an API?

It is not a replacement for package unit tests, BDD tests, Docker/Kubernetes adapter tests, or runtime invariant checks.

## AVA Setup

TypeScript AVA tests should load `ts-node/register` or use the project's normal TypeScript test setup.

```json
{
  "ava": {
    "extensions": ["ts"],
    "files": ["test/**/*.spec.ts"],
    "require": ["ts-node/register"]
  }
}
```

## Testing A Sequence

`runSequence()` is the shortest current path for simple Node fixtures. It loads a Node sequence module, passes `input.body` to the exported function, captures returned records as NDJSON, and records completion.

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

## More Sequence Scenarios

The package docs are organized around sequence behavior:

- [`docs/testing-input-output.md`](docs/testing-input-output.md)
- [`docs/testing-appcontext.md`](docs/testing-appcontext.md)
- [`docs/testing-hub-harness.md`](docs/testing-hub-harness.md)
- [`docs/testing-hub-calls.md`](docs/testing-hub-calls.md)
- [`docs/testing-lifecycle-calls.md`](docs/testing-lifecycle-calls.md)
- [`docs/testing-events.md`](docs/testing-events.md)
- [`docs/testing-exposed-api.md`](docs/testing-exposed-api.md)

Lower-level runner/protocol helpers are documented separately in [`docs/runner-behavior.md`](docs/runner-behavior.md). Those helpers exist to support sequence tests; they should not be the main thing sequence authors test.

## Hub And Context Harness

Use `createHubHarness()` when a sequence needs `this.hub`, lifecycle methods, events, local storage, logging, API registration, RPC, topics, streams, or minimal `this.space` behavior during direct `runSequence()` tests. The harness records normalized Hub calls and context interactions so tests can assert payloads, call counts, and ordered behavior without starting a full Scramjet Transform Hub.

Package-backed fixtures can use `resolveSequenceFixtureMetadata()` to validate `package.json.main`, keep fixture paths inside the fixture directory, default missing engines to Node-compatible metadata, and apply Node-first multi-engine precedence.

## Current Limits

- `runSequence()` currently executes the direct Node path only.
- `createSequenceTest()` currently exposes harness-shaped lifecycle and capture helpers, but does not yet spawn the full runner by itself.
- `createHubHarness()` provides deterministic in-memory Hub/context behavior for sequence tests; it is not a full Transform Hub and `this.space` coverage is intentionally minimal.
- Python and Bun options are available for runner-planning support, but local runtime execution depends on the runtime wrapper/tooling being available.
- Full Transform Hub, Docker adapter, Kubernetes adapter, and BDD workflows remain outside this package's default path.

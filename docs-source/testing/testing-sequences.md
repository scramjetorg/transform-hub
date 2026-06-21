---
id: testing-sequences
slug: /testing/sequences
title: Testing sequences with @scramjet/sequence-test
---

# Testing sequences with @scramjet/sequence-test

> **⚠️ Experimental**: `@scramjet/sequence-test` is an in-progress test harness. It is not the default testing solution for packages in this repository. Keep using each package's existing AVA tests plus package build/lint validation unless the task explicitly requires this package. See the [contributing guide](../development/contributing.md) for the current testing policy.

## Overview

`@scramjet/sequence-test` provides utilities for testing sequence behavior in isolation, without requiring a running Transform Hub instance. It includes:

- **Test harnesses**: `createSequenceTest()` and `runSequence()` for basic sequence execution
- **Hub mocks**: `createHubMock()` and `createHubHarness()` for simulating the Hub API
- **Fixtures**: Temporary sequence directories for testing
- **Captures**: In-memory output, log, and monitoring stream captures
- **Assertions**: Helpers for verifying sequence behavior
- **Runner launchers**: Build environment variables and spawn plans for the outer runner

## Installation

```bash
npm install --save-dev @scramjet/sequence-test
```

## Quick start

### Using `createHubHarness()` (recommended for unit testing)

```typescript
import { createHubHarness } from "@scramjet/sequence-test";
import { Readable } from "stream";

test("my-sequence processes input", async () => {
  const harness = createHubHarness();
  const { context, assert } = harness;

  // Load your sequence function
  const sequence = require("./my-sequence").default;

  // Execute with mock context
  const input = Readable.from([{ value: 1 }, { value: 2 }]);
  await sequence.call(context, input);

  // Assert behavior
  assert.called({ method: "GET", path: "/api/v1/status" });
  assert.callCount({ method: "POST", path: "/api/v1/topics" }, 2);

  // Cleanup any fixtures/transports created by the surrounding test.
});
```

### Using `createSequenceTest()` for full harness

```typescript
import { createSequenceTest } from "@scramjet/sequence-test";

const testHarness = await createSequenceTest({
  runtime: "node",
  sequencePath: "/path/to/sequence.js",
  input: { contentType: "application/x-ndjson", body: { key: "value" } },
});

await testHarness.start();
await testHarness.input({ some: "data" });
await testHarness.waitForCompletion();

// Inspect captures exposed by the returned harness object.
// Exact helper names are experimental; prefer the package exports and tests as
// the source of truth while the package is still in progress.

await testHarness.close();
```

### Using `runSequence()` for quick testing

```typescript
import { runSequence } from "@scramjet/sequence-test";

const result = await runSequence({
  runtime: "node",
  sequencePath: "./my-sequence.js",
});

console.log(result.output.ndjson());
```

> **Note**: `runSequence()` currently only supports Node sequences. It loads the sequence module directly via `require()` and invokes it with the input body.

## Fixtures

Fixtures create temporary directories with sequence files for testing. The fixture helpers are asynchronous and accept file maps, so keep examples close to the package tests while the API is experimental:

```typescript
import { createNodeSequenceFixture } from "@scramjet/sequence-test";

const fixture = await createNodeSequenceFixture({
  "index.js": `
    module.exports = async function (input) {
      const chunks = [];
      for await (const chunk of input) chunks.push(chunk);
      return chunks;
    };
  `
});

console.log(fixture.sequencePath); // /tmp/.../index.js

// Clean up after test
await fixture.cleanup();
```

## Captures

Captures record data flowing through output, log, and monitoring streams. The capture APIs are experimental, so use the exported helpers and the package's own tests as the source of truth for exact method names:

```typescript
import { createOutputCapture, createLogCapture, createMonitoringCapture } from "@scramjet/sequence-test";

const output = createOutputCapture();
const logs = createLogCapture();
const monitoring = createMonitoringCapture();

// Attach captures to the harness/transport under test, then inspect the data
// using the methods exposed by the current package version.
console.log({ output, logs, monitoring });
```

## Runner launcher helpers

`createRunnerLaunchPlan()` builds environment variables for launching the outer runner (`start-runner.ts`) with a given boot config. This is useful for integration-style tests.

```typescript
import { createRunnerLaunchPlan, resolveRunnerEntry } from "@scramjet/sequence-test";

const entry = resolveRunnerEntry(); // resolves path to @scramjet/runner's start-runner.ts
const plan = createRunnerLaunchPlan({
  sequencePath: "/path/to/sequence.js",
  instanceId: "test-instance",
  runtime: "node",
  instancesServer: { host: "127.0.0.1", port: 9000 },
});

// plan contains env vars and spawn options for the outer runner.
```

## Hub mock

`createHubMock()` creates an in-memory mock of the STH Hub API. Route coverage follows the current harness implementation and may change while the package is experimental:

```typescript
import { createHubMock } from "@scramjet/sequence-test";

const hub = createHubMock();

// Use in tests against routes supported by the current harness version:
const response = await hub.handle({
  method: "GET",
  path: "/api/v1/status",
  headers: {},
});
console.log(response.status); // 200
```

## Fake instances server

`createFakeInstancesServer()` creates a fake TCP server that simulates the instances server for testing runner transport connectivity:

```typescript
import { createFakeInstancesServer } from "@scramjet/sequence-test";

const server = await createFakeInstancesServer("test-instance-id");
const port = server.port; // assigned port

// Use the port when configuring runner launch plans.
// After test:
await server.close();
```

## Limitations

- `createSequenceTest()` and `runSequence()` are **phase 1 shells** — runtime wiring is incomplete
- `runSequence()` only supports Node sequences; Python and Bun runtimes are not yet wired
- The hub harness (`createHubHarness()`) is the most mature component and is suitable for unit-testing sequence logic that interacts with the Hub API
- This package is **not a replacement** for package-level AVA tests, BDD tests, adapter tests, or runtime invariant checks

---
id: testing-sequences
slug: /testing/sequences
title: Testing sequences with @scramjet/sequence-test
---

# Testing sequences with @scramjet/sequence-test

> **⚠️ Scope**: `@scramjet/sequence-test` is supported for scoped local sequence fixture, hub-harness, and AppContext validation. It is **not** a replacement for package tests, BDD, adapter/runtime invariant checks, or full live Hub/process/Docker/Kubernetes parity. See the [contributing guide](../development/contributing.md) for the current testing policy.

## Overview

`@scramjet/sequence-test` provides scoped local fixture and hub-harness utilities for testing sequence behavior and AppContext interactions without requiring a running Transform Hub instance. It includes:

Where route paths appear in examples, they use legacy v1-compatible Hub mock routes from the current harness.

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
// Exact helper names may vary; prefer the package exports and tests as
// the source of truth for the current API surface.

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

Fixtures create temporary directories with sequence files for testing. The fixture helpers are asynchronous and accept file maps, so keep examples close to the package tests for the current API surface:

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

Captures record data flowing through output, log, and monitoring streams. Use the exported helpers and the package's own tests as the source of truth for exact method names:

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

`createHubMock()` creates an in-memory mock of the STH Hub API. Route coverage follows the current harness implementation and may change across versions:

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

## AppContext type imports

Sequence authors should import their AppContext type from the canonical split package:

```typescript
import type { SequenceAppContext } from "@scramjet/sequence-types";
```

This provides the frozen sequence-facing AppContext surface (`this.config`, `this.hub`, `this.space`, `this.logger`, `this.localStorage`, `this.api.use()`, lifecycle methods, and v2 `hubClient()`/`spaceClient()` accessors) without coupling to REST DTOs or API client implementation details.

Legacy `@scramjet/types` imports continue to resolve but are deprecated. Internal packages use `@scramjet/runtime-types` for runtime-neutral contracts and `@scramjet/api-types` for API-facing contracts.

## Limitations

- `runSequence()` only supports Node sequences; Python and Bun runtimes are not yet wired
- This package is **supported** for scoped local sequence fixture, hub-harness, and AppContext validation, but is **not a replacement** for package-level AVA tests, BDD tests, adapter tests, or runtime invariant checks

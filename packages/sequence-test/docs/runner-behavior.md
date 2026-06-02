# Runner Behavior Helpers

This package also exposes lower-level helpers for validating or composing runner-protocol behavior:

- `createInputDriver()` writes runner-style input headers and payloads to a writable stream.
- `createOutputCapture()`, `createLogCapture()`, and `createMonitoringCapture()` collect raw bytes and decoded frames.
- `createRunnerEnv()` and `createRunnerLaunchPlan()` build adapter-compatible runner process plans.
- `createFakeInstancesServer()` provides fake host-side channels for runner tests.
- `createHubMock()` is an explicit route table used as supporting infrastructure for sequence tests that call Hub endpoints.

These helpers are useful when extending `@scramjet/sequence-test` itself or diagnosing runner protocol behavior. Sequence developers should prefer behavior-level tests from the other docs.

Example runner-planning assertion:

```ts
import path from "node:path";
import test from "ava";
import { createRunnerLaunchPlan } from "@scramjet/sequence-test";

test("builds a runner launch plan", t => {
  const plan = createRunnerLaunchPlan({
    runtime: "node",
    sequencePath: path.resolve(__dirname, "fixtures/map-ndjson/index.js"),
    instanceId: "12345678-1234-1234-1234-123456789012",
    sequenceId: "12345678-1234-1234-1234-123456789012",
    instancesServer: { host: "127.0.0.1", port: 12345 }
  });

  t.true(plan.entry.includes("start-runner"));
  t.is(plan.stdio[4], "pipe");
  t.is(plan.stdio[5], "pipe");
});
```

Do not use runner-planning tests as a substitute for testing sequence behavior, package unit tests, BDD tests, or runtime invariant checks.

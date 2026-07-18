---
id: examples-tested-incremental-log-aggregator
slug: /examples/tested-incremental-log-aggregator
title: Test an incremental log aggregator
---

# Test an incremental log aggregator

This example is motivated by the public [DVC issue #829](https://github.com/treeverse/dvc/issues/829). Load a real Sequence fixture, execute a synthetic log batch, and verify output and health registration without treating the fixture as a production state store.

Start with the [sequence testing guide](../testing/testing-sequences.md) for the harness scope and validation command. This page covers local fixture execution; deployment against a Hub and adapter is a separate validation path.

## Prerequisites and boundaries

You need a Node.js Sequence project with `@scramjet/sequence-test` installed as a development dependency. The narrow fixture path is Node-only. It does not validate a process, Docker, or Kubernetes adapter, a running Hub, restart behavior, or a real external state store.

The test supplies synthetic log batches and owns a temporary fixture directory. A production implementation must authenticate and authorize any durable store independently.

## Load and execute the Sequence

The aggregator can process a synthetic batch and expose a health route:

```typescript
import {
  createHubHarness,
  createNodeSequenceFixture,
  resolveSequenceFixtureMetadata,
  runSequence,
} from "@scramjet/sequence-test";

type LogEntry = { level: "info" | "error" };
const fixture = await createNodeSequenceFixture({
  "index.js": `
    module.exports = function (input) {
      this.api.use("/health", (_req, res) => res.end(JSON.stringify({ status: "ok" })));
      return input.map(batch => ({
        processed: batch.length,
        errors: batch.filter(entry => entry.level === "error").length,
      }));
    };
  `,
});

try {
  const batch: LogEntry[] = [
    { level: "info" },
    { level: "error" },
  ];
  const metadata = await resolveSequenceFixtureMetadata(fixture.directory);
  const harness = createHubHarness();
  const result = await runSequence({
    runtime: metadata.runtimeKind,
    sequencePath: metadata.mainPath,
    context: harness.context,
    input: { contentType: "application/x-ndjson", body: [batch] },
  });

  result.assert.completed();
  console.log(result.output.ndjson());
  console.log(harness.apiRoutes().map(route => route.path));
} finally {
  await fixture.cleanup();
}
```

This verifies that the packaged entry point loads, the synthetic batch executes,
completion is reported, and the Sequence registers `/health`. It does not prove
durable progression or checkpointing.

## Deployment boundary

Packaging and running the Sequence against a Hub or adapter requires a separate
deployment validation. The focused sequence-test suite validates local loading,
execution, readiness, and health behavior as described in the
[testing guide](../testing/testing-sequences.md).

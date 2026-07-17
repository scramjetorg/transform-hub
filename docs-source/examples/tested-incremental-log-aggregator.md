---
id: examples-tested-incremental-log-aggregator
slug: /examples/tested-incremental-log-aggregator
title: Test an incremental log aggregator
---

# Test an incremental log aggregator

This example is motivated by the public [DVC issue #829](https://github.com/treeverse/dvc/issues/829), where incremental processing raises the practical question of how to test progress without pretending that a test fixture is a production state store. The approach here is deliberately relaxed: use synthetic log batches and a tiny fixture-local cursor to check the aggregation steps.

Start with the [sequence testing dry guide](../testing/testing-sequences.md) for the harness scope and the exact validation command. This page shows the progression shape, not a full deployed wet test.

## Prerequisites and boundaries

You need a Node.js Sequence project with `@scramjet/sequence-test` installed as a development dependency. The narrow fixture path is Node-only. It does not run Python or Bun sequences, and it does not validate a process, Docker, or Kubernetes adapter, a running Hub, restart behavior, or a real external cursor store.

Keep the trust boundary clear: the test supplies synthetic log batches and owns a temporary fixture directory. A configured path or cursor service is not made available by this helper. A production implementation must authenticate and authorize its store independently.

## Model synthetic progression

The aggregator can read a prior total, add one synthetic batch, and overwrite the local cursor with the new total:

```typescript
import { createFileBackedMockCursor } from "@scramjet/sequence-test";

type LogEntry = { level: "info" | "error" };
type Progress = { processed: number; errors: number };

const cursor = createFileBackedMockCursor({
  directory: fixture.directory,
  fileName: "state/log-progress.json",
});

try {
  let progress: Progress;
  try {
    progress = await cursor.read<Progress>();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    progress = { processed: 0, errors: 0 };
  }

  const batch: LogEntry[] = [
    { level: "info" },
    { level: "error" },
  ];
  const next = {
    processed: progress.processed + batch.length,
    errors: progress.errors + batch.filter(entry => entry.level === "error").length,
  };

  await cursor.write(next);
  console.log(await cursor.read<Progress>());
} finally {
  await cursor.cleanup();
}
```

This is synthetic progression: `read()` gets the previous value, the batch is
aggregated, and `write()` overwrites the JSON file. The helper is fixture-local,
non-transactional, and requires explicit cleanup. A missing file is reported as
native filesystem `ENOENT`; other filesystem and JSON failures remain failures.
Do not infer atomic commits, locking, durability, recovery, or checkpointing
from this behavior.

`this.save()` is not persistence or checkpointing. It must not be used in this
example as evidence that progress survives a restart.

## What this test does not prove

The full wet example—packaging and running the Sequence against a Hub, adapter,
or external cursor service—is not the fixture-test subject. There is no external
service or cursor-store integration smoke test here. Validate only the synthetic
aggregation progression and the fixture-local cursor contract with the
[narrowest command in the dry guide](../testing/testing-sequences.md#limitations):

```bash
cd packages/sequence-test && ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 node ../../scripts/run-ava.js test/harness/file-backed-mock-cursor.spec.ts
```

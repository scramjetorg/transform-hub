---
id: examples-source-side-data-summary
slug: /examples/source-side-data-summary
title: Summarize source-side data before a sequence
---

# Summarize source-side data before a sequence

This walkthrough is motivated by the public [Open Energy Platform issue #2362](https://github.com/OpenEnergyPlatform/oeplatform/issues/2362): when the source already has a large collection of files, start with a small inventory rather than pretending the Hub is a shared filesystem.

For the resource and state rules behind this example, read [Sequence configuration, resources, and state](../sequences/sequence-configuration-resources-state.md) first.

## Before you start

You need a local Node.js Sequence project, `@scramjet/sequence-types`, and a
source-side directory that you are allowed to inspect. The example only
summarizes metadata; it does not upload the source files. Package the summary
or pass it as input/configuration when deploying the Sequence.

The process adapter can read a host path when permissions allow it. Docker and
Kubernetes can read only package content and resources explicitly exposed to the
container or Pod. This example therefore keeps the source scan outside the
Sequence Runner. A configured path or URL is a pointer, not a guarantee that the
adapter can reach it.

## Make a compact summary

The following source-side script produces JSON that can be sent to a Sequence:

```typescript
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.argv[2];
if (!root) throw new Error("usage: summarize <source-directory>");
const entries = await readdir(root, { withFileTypes: true });
const files: Array<{ file: string; bytes: number }> = [];

for (const entry of entries) {
  if (!entry.isFile()) continue;
  const file = path.join(root, entry.name);
  const info = await stat(file);
  files.push({ file: entry.name, bytes: info.size });
}

process.stdout.write(JSON.stringify({ root, files }) + "\n");
```

The `root` value is source-side metadata. Do not assume that the same absolute
path exists in a Docker container or Kubernetes Pod. If the Sequence needs the
files later, provide an adapter-visible mount or an external service and apply
its authentication and authorization rules there.

## Consume the summary

A Sequence can validate and aggregate the summary without claiming ownership of
the source data:

```typescript
import type { ReadableStream, SequenceApplication, SequenceAppContext } from "@scramjet/sequence-types";

type SourceSummaryItem = { file: string; bytes: number };
type SourceSummary = { files: SourceSummaryItem[] };
type SummaryTotals = { files: number; bytes: number };

function isSourceSummary(value: unknown): value is SourceSummary {
  if (typeof value !== "object" || value === null || !Array.isArray((value as { files?: unknown }).files)) return false;
  return (value as { files: unknown[] }).files.every(item =>
    typeof item === "object" && item !== null &&
    typeof (item as { file?: unknown }).file === "string" &&
    typeof (item as { bytes?: unknown }).bytes === "number" &&
    Number.isFinite((item as { bytes: number }).bytes) &&
    (item as { bytes: number }).bytes >= 0
  );
}

const application: SequenceApplication<SourceSummary, SummaryTotals> = async function (
  this: SequenceAppContext,
  input: ReadableStream<SourceSummary>
) {
  let files = 0;
  let bytes = 0;
  for await (const summary of input) {
    if (!isSourceSummary(summary)) throw new Error("invalid source summary shape");
    for (const item of summary.files) {
      if (item.file.includes("..") || item.file.startsWith("/")) throw new Error("invalid source-relative file");
      files++;
      bytes += item.bytes;
    }
  }
  async function* output() {
    yield { files, bytes };
  }
  return output();
};

export default application;
```

The trust boundary is deliberate: the source-side producer controls the
inventory, while the Sequence treats it as input and validates relative names
and numeric values before using them. Neither side receives runtime-managed
checkpointing. If progression needs persistence, use an explicitly operated
durable store; do not use `this.save()` as evidence of persistence.

## Local fixture-only cursor

To illustrate progression in a local test or documentation fixture, use the
public `createFileBackedMockCursor` helper. It writes JSON under a relative path
inside the temporary fixture directory, overwrites on each `write()`, and needs
an explicit `cleanup()`. `read()` fails if no file exists. It is deliberately
non-transactional and has no durability, locking, recovery, or runtime-managed
checkpoint semantics, so it is not an external-resource integration.

```typescript
import { createFileBackedMockCursor } from "@scramjet/sequence-test";

const cursor = createFileBackedMockCursor({ directory: fixture.directory, fileName: "state/progress.json" });
try {
  await cursor.write({ files: 12, bytes: 4096 });
  const progress = await cursor.read<{ files: number; bytes: number }>();
  console.log(progress);
} finally {
  await cursor.cleanup();
}
```

## Smallest validation

For this local contract, run the focused fixture test from the repository root:

```bash
cd packages/sequence-test && ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 node ../../scripts/run-ava.js test/harness/file-backed-mock-cursor.spec.ts
```

This validates the local helper and summary-shaped fixture behavior only; it is
not a Docker, Kubernetes, external-store, or source-system smoke test.

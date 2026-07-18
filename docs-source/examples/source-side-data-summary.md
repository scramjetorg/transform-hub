---
id: examples-source-side-data-summary
slug: /examples/source-side-data-summary
title: Read source-side data in a Sequence
---

# Read source-side data in a Sequence

This walkthrough is motivated by the public [Open Energy Platform issue #2362](https://github.com/OpenEnergyPlatform/oeplatform/issues/2362): when the source already has a large collection of files, read a small amount of metadata rather than pretending the Hub is a shared filesystem.

For the resource and state rules behind this example, read [Sequence configuration, resources, and state](../sequences/sequence-configuration-resources-state.md) first.

## Before you start

You need a local Node.js Sequence project, `@scramjet/sequence-types`, and a
source-side directory that the Sequence process is allowed to inspect. The
directory is configured on the Sequence; source files are not uploaded or put
on the input stream.

The process adapter can read a host path when permissions allow it. Docker and
Kubernetes require the directory to be explicitly exposed to the container or
Pod. A configured path is therefore a deployment-local setting, not a promise
that the same absolute path exists in every adapter.

## Read and yield metadata incrementally

The Sequence validates its configured directory, opens it once, validates each
entry and its metadata, and yields one result at a time. There is no separate
producer and no input model containing precomputed results.

```typescript
import { opendir, stat } from "node:fs/promises";
import * as path from "node:path";
import type { SequenceApplication, SequenceAppContext } from "@scramjet/sequence-types";

type SourceEntrySummary = { file: string; bytes: number; modifiedAt: string };
type SourceConfig = { sourceDirectory: string };

async function validateDirectory(value: unknown): Promise<string> {
  if (typeof value !== "string" || !path.isAbsolute(value)) {
    throw new Error("sourceDirectory must be an absolute local path");
  }
  const info = await stat(value);
  if (!info.isDirectory()) throw new Error("sourceDirectory must be a directory");
  return path.resolve(value);
}

const application: SequenceApplication<unknown, SourceEntrySummary> = async function (
  this: SequenceAppContext<SourceConfig>,
  _input: unknown
) {
  const root = await validateDirectory(this.config.sourceDirectory);
  const directory = await opendir(root);
  this.api.use("/health", (_req: unknown, res: { end(body: string): void }) => res.end(JSON.stringify({ status: "ok" })));

  return (async function* () {
    for await (const entry of directory) {
      if (!entry.isFile() || path.basename(entry.name) !== entry.name) continue;
      const file = path.resolve(root, entry.name);
      const relative = path.relative(root, file);
      if (relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
        throw new Error("directory entry escaped sourceDirectory");
      }
      const info = await stat(file);
      if (!info.isFile() || !Number.isSafeInteger(info.size) || info.size < 0 || Number.isNaN(info.mtimeMs)) {
        throw new Error(`invalid metadata for ${entry.name}`);
      }
      yield { file: relative, bytes: info.size, modifiedAt: info.mtime.toISOString() };
    }
  })();
};

export default application;
```

The trust boundary is deliberate: the configured directory is deployment-local,
and every emitted name and metadata value is checked before it is yielded. The
Sequence does not claim ownership of the files or persist scan progress. If the
source needs durable progression, use an explicitly operated durable store; do
not use `this.save()` as evidence of persistence.

## Validate the real Sequence

This focused check loads the packaged entry point, executes it against a local
fixture directory, consumes its incremental output, and checks readiness and
health registration. Replace `sequenceDirectory` with the built package that
contains the example above.

```typescript
import { createHubHarness, createSequenceTest, resolveSequenceFixtureMetadata } from "@scramjet/sequence-test";

export async function validateSourceSummary(sequenceDirectory: string, sourceDirectory: string): Promise<void> {
  const metadata = await resolveSequenceFixtureMetadata(sequenceDirectory);
  const harness = createHubHarness();
  const context = { ...harness.context, config: { sourceDirectory } };
  const loaded = require(metadata.mainPath) as { default?: Function } | Function;
  const application = typeof loaded === "function" ? loaded : loaded.default;
  if (typeof application !== "function") throw new Error("sequence entry point is not callable");
  const output = await application.call(context, undefined);
  const summaries: unknown[] = [];
  for await (const summary of output) summaries.push(summary);

  const readiness = await createSequenceTest({
    runtime: "node",
    sequencePath: metadata.mainPath
  });
  await readiness.validate();
  await readiness.initialize();
  await readiness.activateRoute("/health");
  if (readiness.state() !== "ready") throw new Error("Sequence did not become ready");
  const healthRoute = harness.apiRoutes().find(route => route.path === "/health");
  if (!healthRoute || typeof healthRoute.handler !== "function") throw new Error("health route missing");
  let healthBody = "";
  (healthRoute.handler as (req: unknown, res: { end(body: string): void }) => void)({}, {
    end(body) { healthBody = body; }
  });
  if (JSON.parse(healthBody).status !== "ok") throw new Error("health check failed");
  console.log(summaries);
  await readiness.close();
}
```

This validates loading, execution, incremental reads, readiness, and health
registration only. It is not a Docker, Kubernetes, external-store, or
source-system smoke test. If validation or `opendir` fails, the application
rejects before registering `/health`; treat that rejected load as an errored
Sequence outcome rather than exposing a health route for an unusable source.

---
id: examples-source-side-data-summary
slug: /examples/source-side-data-summary
title: Read source-side data in a Sequence
---

# Read source-side data in a Sequence

When your source data is already in a local directory, run the Sequence where that directory is accessible. This example reads file metadata incrementally and yields compact summaries instead of uploading source files or treating the Hub as a shared filesystem. It is motivated by [Open Energy Platform #2362](https://github.com/OpenEnergyPlatform/oeplatform/issues/2362), a public request to summarize source-side data without moving the source files.

## Prerequisites

You need Node.js 18 or later, a Sequence project using `@scramjet/sequence-types`, the `sth` and `si` commands, and a readable absolute source directory. This walkthrough uses `/opt/example/source-data`.

The configured path is a trust boundary. With the Process Adapter, the runner can read a host path when its OS permissions allow it. With Docker or Kubernetes, the same path has no effect until you explicitly bind-mount or provide a volume at that path in the runner container or Pod. Treat `sourceDirectory` as deployment-local configuration, not as a guarantee of a shared filesystem.

## Sequence

The Sequence validates an absolute directory and opens it before registering `/health`. It checks every directory entry and its metadata, then yields one summary for each regular file.

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

  this.api.use("/health", (_req: unknown, res: { end(body: string): void }) => {
    res.end(JSON.stringify({ status: "ok" }));
  });

  return (async function* () {
    for await (const entry of directory) {
      if (!entry.isFile() || path.basename(entry.name) !== entry.name) continue;

      const file = path.resolve(root, entry.name);
      const relative = path.relative(root, file);
      if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error("directory entry escaped sourceDirectory");
      }

      const info = await stat(file);
      if (
        !info.isFile() ||
        !Number.isSafeInteger(info.size) ||
        info.size < 0 ||
        Number.isNaN(info.mtimeMs)
      ) {
        throw new Error(`invalid metadata for ${entry.name}`);
      }

      yield { file: relative, bytes: info.size, modifiedAt: info.mtime.toISOString() };
    }
  })();
};

export default application;
```

Directory names and metadata can change while a scan is running. This example fails on invalid metadata rather than emitting unchecked values, does not read file contents, and does not persist scan progress. Use a deliberately operated durable store if you need resumable progress.

## Packaging

Follow the [installed Sequence setup and run guide](../sequences/setup-and-run.md) for the complete walkthrough. Build your Sequence, install only its production dependencies, and package the directory. The archive must include `node_modules/` for this Process Adapter workflow.

```sh
npm install
npm run build
npm install --omit=dev
si sequence pack . -o source-side-data-summary.tar.gz
```

## Foreground Hub

Keep this terminal running. The Hub store is separate from the source directory; the Process Adapter reads `/opt/example/source-data` directly from the host.

```sh
mkdir -p sequence-store
sth --runtime-adapter process --hostname 127.0.0.1 --port 8000 \
  --sequences-root "$PWD/sequence-store"
```

## Readiness

In another terminal, wait until the Hub reports ready.

```sh
timeout 60s sh -c '
  until curl --fail --silent http://127.0.0.1:8000/api/v1/status |
    node -e "let s=\"\"; process.stdin.on(\"data\", c => s += c).on(\"end\", () => process.exit(JSON.parse(s).ready === true ? 0 : 1))";
  do :; done
'
```

## Deploy and start

Deploy the package with the absolute path that is accessible to this runner, then use the returned instance ID in the output command.

```sh
si config set apiUrl http://127.0.0.1:8000
si sequence deploy ./source-side-data-summary.tar.gz \
  --config-string '{"sourceDirectory":"/opt/example/source-data"}'
si instance list
si instance info <instance-id>
```

`si instance list` shows the instance, and `si instance info <instance-id>` reports its started state. The Sequence registers `/health` only after opening the configured directory, and that route returns `{"status":"ok"}`. Invalid configuration or an unreadable directory rejects before the health route is exposed.

## Output

Read yielded data from the instance output stream, not from logs.

```sh
si instance output <instance-id>
```

Each yielded `{file, bytes, modifiedAt}` value is delivered as newline-delimited JSON, one object per regular file. Use `si instance log <instance-id>` only for `console.log` or standard-output text.

For the configuration and state model behind reading source-side data, see the [sequence configuration, resources, and state guide](../sequences/sequence-configuration-resources-state.md).

## Local verification (optional)

Confirm that the instance starts only with a readable absolute directory, `/health` is available after the directory opens, and `si instance output` contains one compact JSON summary for each regular file. An invalid path or metadata error fails before unchecked output is emitted.

## What this demonstrates

You can run a Sequence alongside source data that is accessible to its runtime and stream compact metadata summaries without uploading the source files or assuming a shared filesystem. For Docker and Kubernetes deployments, explicitly mount the source directory into each runner environment and configure the container-visible path. A successful run shows compact metadata summaries for each regular file in the source directory.

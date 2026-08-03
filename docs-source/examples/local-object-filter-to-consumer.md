---
id: example-local-object-filter-to-consumer
slug: /examples/local-object-filter-to-consumer
title: Filtering local object data for a consumer
---

# Filtering local object data for a consumer

Filter object names where the files are accessible, then publish the useful summary to a consumer Sequence over a Hub topic. The workflow is motivated by [NVIDIA AIStore #305](https://github.com/NVIDIA/aistore/issues/305), a public request for filtering data close to its source.

Read the [sequence communication guide](../sequences/sequence-communication.md) for the producer-to-consumer contract.

## Prerequisites

You need Node.js 18+, the published `sth` and `si` commands, a producer Sequence project, and a consumer Sequence that accepts NDJSON on its input stream. Configure the producer with a source directory that the Runner can read.

With the Process Adapter, `/path/visible-to-the-runner/source` is a path on the Hub host and the Runner has that host's filesystem visibility and permissions. With Docker or Kubernetes, mount the intended source directory into the Runner and configure the mounted container path instead. Do not expose arbitrary host paths through an API.

## Producer Sequence

```typescript
import { readdir } from "node:fs/promises";
import { Readable } from "node:stream";
import type { HubClient } from "@scramjet/rest-api2";
import type { SequenceAppContext } from "@scramjet/sequence-types";

type Config = { sourceDirectory: string };
type Context = SequenceAppContext<Config, unknown, HubClient, unknown>;

export default async function (this: Context) {
  const topic = "filtered-local-objects";
  const names = (await readdir(this.config.sourceDirectory as string))
    .filter(name => name.endsWith(".json"));
  const summary = { count: names.length, names: names.slice(0, 100) };

  await this.hubClient().topicWrite.post({
    params: { name: topic },
    headers: { "content-type": "application/x-ndjson" },
    body: Readable.from([Buffer.from(`${JSON.stringify(summary)}\n`)])
  });
  this.emit("source.summary", { topic, count: summary.count });
  return summary;
}
```

The returned summary is this instance's result. `source.summary` is a transient host event for observers; it is not consumer delivery and can be lost on disconnect. The `filtered-local-objects` topic is the live NDJSON route: start the consumer with that topic as its input before starting this producer. Topics are not persisted or replayed, so a reconnect does not recover missed records.

The producer reads only its configured source directory and sends data through the Hub transport. The Hub does not become a shared filesystem, and the consumer should receive the summary from its input stream rather than attempt to read the producer's path.

## Packaging terminal

Follow the [installed Sequence setup and run guide](../sequences/setup-and-run.md). Build the package, install production dependencies into it, and create the archive:

```sh
npm install
npm run build
npm install --production
si sequence pack . -o object-filter.tar.gz
```

## Foreground Hub terminal

Create the sequence store and leave the Hub running in this terminal:

```sh
mkdir -p sequence-store
sth --runtime-adapter process --hostname 127.0.0.1 --port 8000 --sequences-root "$PWD/sequence-store"
```

## Readiness terminal

In another terminal, wait until the Hub reports ready:

```sh
timeout 60s sh -c '
  until curl --fail --silent http://127.0.0.1:8000/api/v1/status |
    node -e "let s=\"\"; process.stdin.on(\"data\", c => s += c).on(\"end\", () => process.exit(JSON.parse(s).ready === true ? 0 : 1))";
  do :; done
'
```

## Output/consumer terminal

Start the already-uploaded consumer first so its input stream is connected to the live topic. Replace the placeholder with the consumer's uploaded Sequence ID:

```sh
si config set apiUrl http://127.0.0.1:8000
si topic create filtered-local-objects --content-type application/x-ndjson
si sequence start <consumer-sequence-id> --input-topic filtered-local-objects
si instance stdout <consumer-instance-id>
```

## Deploy/start terminal

Upload the producer, then start it with the source directory visible to its Runner. `sequence deploy` uploads and starts in one step; use the separate upload/start path when you need to start the consumer first.

```sh
si config set apiUrl http://127.0.0.1:8000
si sequence deploy ./object-filter.tar.gz --config-string '{"sourceDirectory":"/path/visible-to-the-runner/source"}'
# Or separate upload and start:
si sequence send ./object-filter.tar.gz
si sequence start <sequence-id> --config-string '{"sourceDirectory":"/path/visible-to-the-runner/source"}'
```

## Output terminal

Inspect the producer result and its event/log output:

```sh
si instance info <instance-id>
si instance log <instance-id>
si instance stdout <instance-id>
```

For a Manager-routed deployment, connect the Hub to the Manager and point `si` at the Manager endpoint. The Manager routes lifecycle requests, but the Runner still executes on the connected Hub; its source path must be visible there. For Docker or Kubernetes, use the selected adapter's mount configuration and do not assume Process Adapter host-path visibility carries over.

For details on topic names and topic-based communication, see the [sequence topics guide](../sequences/sequence-topics.md).

## Local verification (optional)

Run your Sequence project's existing build and test commands before packaging. Those checks can validate your code, but they cannot prove that the selected adapter can see or read the configured source directory.

## What this demonstrates

You can filter files where they are accessible and forward the useful records as NDJSON to a connected consumer Sequence. The producer's return value and event are useful for inspection, while the topic carries the live consumer handoff without treating the Hub as a shared filesystem. A successful run shows the filtered summary published to the consumer topic.

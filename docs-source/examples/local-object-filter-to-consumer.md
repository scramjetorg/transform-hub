---
id: example-local-object-filter-to-consumer
slug: /examples/local-object-filter-to-consumer
title: Filtering local object data for a consumer
---

# Filtering local object data for a consumer

This walkthrough is motivated by [NVIDIA AIStore issue #305](https://github.com/NVIDIA/aistore/issues/305): keep object-data handling near the source and send a small useful result onward. It is a local pattern, not a claim that Transform Hub replaces an object store or reproduces AIStore.

See [choosing a communication path](../sequences/sequence-communication.md).

Prerequisites: Node.js 18+, a process-adapter sequence with access to a configured local source, and a consumer that accepts NDJSON. The source directory is outside Hub ownership; grant the sequence only the intended read access. Do not expose arbitrary paths through an API.

```typescript
import { readdir } from "node:fs/promises";
import type { SequenceAppContext } from "@scramjet/sequence-types";

export default async function (this: SequenceAppContext) {
  const source = this.config.sourceDirectory as string;
  const names = (await readdir(source)).filter(name => name.endsWith(".json"));
  const summary = { count: names.length, names: names.slice(0, 100) };
  this.emit("source.summary", summary);
  return summary;
}
```

The returned object is a request/output result; the event is only a transient notification. For large inventories, stream or page the result, or write an application-owned artifact and return its reference. A consumer or event connection can disconnect without replay. Validate locally with the sequence-test fixture/harness; the smallest command is `npm run test:sequence-appcontext`.

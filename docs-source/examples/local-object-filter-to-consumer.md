---
id: example-local-object-filter-to-consumer
slug: /examples/local-object-filter-to-consumer
title: Filtering local object data for a consumer
---

# Filtering local object data for a consumer

This walkthrough is motivated by [NVIDIA AIStore issue #305](https://github.com/NVIDIA/aistore/issues/305): keep object-data handling near the source and send a useful result onward. The pattern keeps the source directory outside Hub ownership; it does not replace an object store.

See [choosing a communication path](../sequences/sequence-communication.md).

Use the [installed Sequence setup and run guide](../sequences/setup-and-run.md) for package
installation, local Hub startup, readiness, and direct or Manager-routed execution.

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

The returned object is a request/output result; the event is a transient notification. For large inventories, stream or page the result, or write an application-owned artifact and return its reference. A consumer or event connection can disconnect without replay. Maintainers may use `npm run test:sequence-appcontext` as optional AppContext evidence.

## Install and connect the deliverable with the Process Adapter

Use the canonical [installed Sequence setup and run guide](../sequences/setup-and-run.md). Build the package, install production dependencies into the package, and create the archive:

### Packaging terminal

```sh
npm install
npm run build
npm install --production
si sequence pack . -o object-filter.tar.gz
```

### Hub terminal

```sh
mkdir -p sequence-store
sth --runtime-adapter process --hostname 127.0.0.1 --port 8000 --sequences-root "$PWD/sequence-store"
```

### Readiness terminal

```sh
timeout 60s sh -c '
  until curl --fail --silent http://127.0.0.1:8000/api/v1/status |
    node -e "let s=\"\"; process.stdin.on(\"data\", c => s += c).on(\"end\", () => process.exit(JSON.parse(s).ready === true ? 0 : 1))";
  do :; done
'
```

Deploy with the required source configuration, then observe the result and hand it to the NDJSON consumer:

### Deploy/start terminal

```sh
si config set apiUrl http://127.0.0.1:8000
si sequence deploy ./object-filter.tar.gz --config-string '{"sourceDirectory":"/path/visible-to-the-runner/source"}'
# Or separate upload and start:
si sequence send ./object-filter.tar.gz
si sequence start <sequence-id> --config-string '{"sourceDirectory":"/path/visible-to-the-runner/source"}'
si instance info <instance-id>
si instance log <instance-id>
si instance stdout <instance-id>
```

Live success is a completed instance whose result reports the filtered JSON count/names and whose logs or output show `source.summary`; the consumer receives that result or the transient event only while connected. The Process Adapter shares the host filesystem and process namespace, has no container resource isolation, and ties Runner cleanup to Hub lifecycle. For a Manager-routed deployment, connect the Hub to the Manager first and target its endpoint with `si config set apiUrl http://manager-host:8200`; Manager routes the upload/start request to the connected Hub, while the Process Adapter still reads only the path visible on that Hub host.

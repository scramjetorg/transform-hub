---
id: examples-tested-incremental-log-aggregator
slug: /examples/tested-incremental-log-aggregator
title: Build an incremental log aggregator
---

# Build an incremental log aggregator

Build a Node.js Sequence that accepts one JSON log batch at a time and emits the aggregate for each batch. The Sequence registers a health endpoint while it runs. The workflow is motivated by [DVC #829](https://github.com/treeverse/dvc/issues/829), a public request for incremental log handling.

Read the [testing Sequences guide](../testing/testing-sequences.md) for the test model used alongside this deployed workflow.

## Prerequisites

You need Node.js `>=18`, `@scramjet/sth`, `@scramjet/cli`, and a Node.js Sequence project. Include the Sequence's production dependencies in the packed archive.

Create `index.js` in your Sequence project:

```javascript
module.exports = function (input) {
  this.api.use("/health", (_req, res) => res.end(JSON.stringify({ status: "ok" })));

  return input.map((batch) => {
    if (!Array.isArray(batch) || !batch.every((entry) => entry && typeof entry.level === "string")) {
      throw new Error("Each input value must be an array of log entries with a level");
    }

    return {
      processed: batch.length,
      errors: batch.filter((entry) => entry.level === "error").length,
    };
  });
};
```

Each NDJSON input value must be a JSON array of log entries. This implementation aggregates each value as it arrives; it does not retain state across values or restarts. Add authenticated, durable storage only if your application needs cumulative or checkpointed aggregates.

## Deploy with the Process Adapter

Package and run the deliverable with the canonical [Set up and run an installed Sequence](../sequences/setup-and-run.md) workflow. This example uses a Process Adapter Hub on `127.0.0.1:8000` and stores uploaded archives in `sequence-store/`. Keep the Hub command running in the foreground while you deploy and run the instance.

### Package

```sh
npm install
npm run build
npm install --production
si sequence pack . -o incremental-log-aggregator.tar.gz
```

### Foreground Hub

```sh
mkdir -p sequence-store
sth --runtime-adapter process --hostname 127.0.0.1 --port 8000 \
  --sequences-root "$PWD/sequence-store"
```

### Readiness

```sh
timeout 60s sh -c '
  until curl --fail --silent http://127.0.0.1:8000/api/v1/status |
    node -e "let s=\"\"; process.stdin.on(\"data\", c => s += c).on(\"end\", () => process.exit(JSON.parse(s).ready === true ? 0 : 1))";
  do :; done
'
```

### Deploy and start

```sh
si config set apiUrl http://127.0.0.1:8000
si sequence deploy ./incremental-log-aggregator.tar.gz
```

### Input

```sh
echo '[{"level":"info"},{"level":"error"}]' | si instance input <instance-id>
```

### Output

```sh
si instance info <instance-id>
si instance stdout <instance-id>
si instance log <instance-id>
```

For Docker or Kubernetes, deploy the same packed artifact with that adapter's required runner image, storage, and network configuration. The Process Adapter command does not provide container isolation.

## Local verification (optional)

Install `@scramjet/sequence-test` as a development dependency when you want a fast, local check of your own Sequence before deployment. A harness can feed representative valid and invalid batches, inspect emitted aggregates, and confirm that `/health` is registered without starting a Hub. It is useful for iteration, but it does not validate adapter behavior, restarts, or durable state.

## What this demonstrates

You can process log entries incrementally by aggregating each incoming batch instead of waiting for a complete log set. Instance output lets you observe the aggregate for each batch as it is processed, while input validation rejects malformed values clearly. This keeps aggregation responsive and makes invalid input visible without obscuring the normal deployment workflow. A successful run shows the aggregated output for each batch on the instance output stream.

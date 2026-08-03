---
id: examples-simple-transform
slug: /examples/simple-transform
title: Simple data transform sequence
---

# Simple data transform sequence

Build your first Node Sequence to receive JSON records, multiply each `value`, and return the transformed records. The sequence also writes logs, reports how many records it has processed through monitoring, and handles a graceful stop.

## Prerequisites

You need Node.js 18 or later, npm, and installed `sth` and `si` CLI commands. Create a Node package with a build script that compiles your TypeScript entry point to `dist/simple-transform.js`.

Your `package.json` needs this package metadata:

```json
{
  "name": "@example/simple-transform",
  "version": "1.0.0",
  "main": "dist/simple-transform.js",
  "engines": {
    "node": ">=18"
  }
}
```

## Write the transform

Create `src/simple-transform.ts`:

```typescript
import type { SequenceAppContext } from "@scramjet/sequence-types";
import { Readable } from "stream";

interface InputRecord {
  id: string;
  value: number;
  timestamp?: string;
}

interface OutputRecord {
  id: string;
  doubled: number;
  processedAt: string;
}

export default async function (
  this: SequenceAppContext<{ multiplier?: number }>,
  input: Readable
): Promise<OutputRecord[]> {
  const multiplier = this.config?.multiplier ?? 2;
  const results: OutputRecord[] = [];
  let count = 0;

  this.logger.info("sequence starting", { multiplier });

  this.addMonitoringHandler((current) => ({
    ...current,
    custom: { processedCount: count },
  }));

  this.addStopHandler(async (_timeout, canCallKeepalive) => {
    this.logger.info("graceful stop requested", { processedCount: count });
    if (canCallKeepalive) {
      this.keepAlive(2000);
    }
  });

  for await (const chunk of input) {
    const records: InputRecord[] = Array.isArray(chunk) ? chunk : [chunk];

    for (const record of records) {
      count++;
      results.push({
        id: record.id,
        doubled: record.value * multiplier,
        processedAt: new Date().toISOString(),
      });

      this.logger.debug("processed record", {
        id: record.id,
        originalValue: record.value,
        doubledValue: record.value * multiplier,
      });
    }
  }

  this.logger.info("sequence completed", { totalProcessed: count });
  return results;
}
```

The `input` stream supplies records one at a time or in batches. You return an array of output records after the stream ends. `this.config` reads the deployment configuration, `this.logger` writes instance logs, and the monitoring handler exposes the running `processedCount`. The stop handler logs a stop request and requests a short keepalive period when the runtime permits it.

## Package the sequence

Build the package, install its production dependencies, and create the archive that you deploy to the Hub:

```sh
npm install
npm run build
npm install --production
si sequence pack . -o simple-transform.tar.gz
```

See the [setup and run guide](../sequences/setup-and-run.md) for the canonical walkthrough.

## Start the Hub

In a separate terminal, start a local Process Adapter Hub in the foreground. Keep this terminal running while you deploy and run the sequence:

```sh
mkdir -p sequence-store
sth --runtime-adapter process --hostname 127.0.0.1 --port 8000 \
  --sequences-root "$PWD/sequence-store"
```

## Wait for readiness

In another terminal, wait until the Hub reports that it is ready:

```sh
timeout 60s sh -c '
  until curl --fail --silent http://127.0.0.1:8000/api/v1/status |
    node -e "let s=\"\"; process.stdin.on(\"data\", c => s += c).on(\"end\", () => process.exit(JSON.parse(s).ready === true ? 0 : 1))";
  do :; done
'
```

## Deploy and start the sequence

Configure the installed CLI to use your Hub, then deploy the archive with a multiplier of five. Note the instance ID printed by the deploy command:

```sh
si config set apiUrl http://127.0.0.1:8000
si sequence deploy ./simple-transform.tar.gz --config-string '{"multiplier":5}'
```

## Send input

Replace `<instance-id>` with the ID from deployment and send two JSON records:

```sh
printf '%s\n' '{"id":"a","value":10}' '{"id":"b","value":20}' | \
  si instance input <instance-id>
```

## Retrieve output and inspect the instance

Retrieve the transformed output, then inspect the instance and its logs. The output for `a` contains `doubled: 50`, the output for `b` contains `doubled: 100`, and the logs include the multiplier and processed records. The instance information also includes the monitoring data, including `processedCount` while it runs.

```sh
si instance stdout <instance-id>
si instance list
si instance info <instance-id>
si instance log <instance-id>
```

## Local verification (optional)

Before packaging, run your package's test command if you have added tests:

```sh
npm test
```

## What this demonstrates

You can package a small Node transform, run it on an installed Hub, send it JSON records, and inspect its transformed output, logs, instance details, and monitoring data. A successful run shows the doubled values in the output stream.

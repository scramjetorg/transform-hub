---
id: examples-simple-transform
slug: /examples/simple-transform
title: Simple data transform sequence
---

# Simple data transform sequence

This example shows a Node.js sequence that receives JSON data, transforms it, and returns results. It demonstrates input/output handling, logging, monitoring, and graceful stop.

```typescript
import { AppContext } from "@scramjet/types";
import { Readable, Transform } from "stream";

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
  this: AppContext<{ multiplier?: number }>,
  input: Readable
): Promise<OutputRecord[]> {
  const multiplier = this.config?.multiplier ?? 2;
  const results: OutputRecord[] = [];
  let count = 0;

  this.logger.info("sequence starting", { multiplier });

  // Register monitoring handler for custom health data
  this.addMonitoringHandler((current) => ({
    ...current,
    custom: { processedCount: count },
  }));

  // Register stop handler for graceful shutdown
  this.addStopHandler(async (timeout, canCallKeepalive) => {
    this.logger.info("graceful stop requested", { processedCount: count });
    // Flush any pending work
    if (canCallKeepalive) {
      this.keepAlive(2000);
    }
  });

  // Process input stream
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

## Running the example

**package.json:**

```json
{
  "name": "@example/simple-transform",
  "version": "1.0.0",
  "main": "dist/simple-transform.js",
  "engines": {
    "node": ">=16"
  }
}
```

**Send and start:**

```bash
# Package the sequence directory as a tarball
tar czf simple-transform.tar.gz --transform='s|^\./||' -C ./simple-transform .

# Upload to Hub
curl -X POST http://localhost:8000/api/v1/sequence \
  -F "package=@simple-transform.tar.gz"

# Start with custom config
curl -X POST http://localhost:8000/api/v1/sequence/<id>/start \
  -H "Content-Type: application/json" \
  -d '{"appConfig": {"multiplier": 5}}'

# Send input data
curl -X POST http://localhost:8000/api/v1/instance/<instanceId>/input \
  -H "Content-Type: application/x-ndjson" \
  -d '{"id":"a","value":10}
{"id":"b","value":20}'

# Read output
curl http://localhost:8000/api/v1/instance/<instanceId>/output
```

Expected output:

```
{"id":"a","doubled":50,"processedAt":"2026-06-21T..."}
{"id":"b","doubled":100,"processedAt":"2026-06-21T..."}
```

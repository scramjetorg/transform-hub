---
id: example-mcp-bridged-job-status
slug: /examples/mcp-bridged-job-status
title: Bridging job status to MCP
---

# Bridging job status to MCP

This walkthrough is motivated by [Galaxy/Loom issue #74](https://github.com/galaxyproject/loom/issues/74), where a tool-facing interface needs a small job-status surface rather than direct ownership of the worker. It is a relaxed, local example and does not reproduce Galaxy, Loom, or a production tunnel.

Read [exposing a sequence HTTP API](../sequences/sequence-api-exposure.md) first.

## Sequence endpoint

Prerequisites: Node.js 18+, a packaged sequence, a process-adapter Hub, and the Node MCP SDK in the separately run bridge. A file-backed cursor below is a documentation/fixture-only temporary file; it is not a Compose service or production store.

```typescript
import { readFile } from "node:fs/promises";
import type { SequenceAppContext } from "@scramjet/sequence-types";

export async function initialize(this: SequenceAppContext) {
  const config = this.config as { cursorFile: string };
  await readFile(config.cursorFile, "utf8");
  this.api.use("/status", async () => ({ instanceId: this.instanceId, ready: true }));
}

export default async function (this: SequenceAppContext) {
  await new Promise(() => {});
}
```

The route is registered only after the local prerequisite succeeds. A real implementation should expose an explicit validation phase and structured failure handling rather than using the illustrative pending promise as a retry mechanism.

## External MCP bridge

The bridge owns MCP protocol handling and calls the sequence HTTP route. Install the SDK in the bridge project with `npm install @modelcontextprotocol/sdk zod`. This inline bridge uses the fixture cursor as a local, cleaned-up cache and validates the instance id before calling the private route:

```typescript
import { readFile } from "node:fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { unlink } from "node:fs/promises";
import { z } from "zod";

const hubUrl = process.env.SEQUENCE_URL ?? "http://hub:8000/status";
const cursorFile = process.env.CURSOR_FILE ?? "/tmp/mcp-job-status.json";
const server = new McpServer({ name: "job-status-bridge", version: "0.1.0" });
process.once("SIGTERM", async () => {
  await unlink(cursorFile).catch(() => undefined);
  process.exit(0);
});

server.registerTool("job_status", {
  description: "Read the bounded status of one running job",
  inputSchema: { instanceId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }
}, async ({ instanceId }) => {
  const cursor = JSON.parse(await readFile(cursorFile, "utf8")) as { instanceId?: string };
  if (cursor.instanceId !== instanceId) {
    return { isError: true, content: [{ type: "text", text: "unknown job" }] };
  }
  const response = await fetch(hubUrl);
  if (!response.ok) throw new Error(`sequence status HTTP ${response.status}`);
  const status = await response.json() as { ready?: boolean; instanceId?: string };
  if (status.instanceId !== instanceId || status.ready !== true) {
    return { isError: true, content: [{ type: "text", text: "job is not ready" }] };
  }
  return { content: [{ type: "text", text: JSON.stringify({ instanceId, ready: true }) }] };
});

await server.connect(new StdioServerTransport());
```

The fixture file is intentionally ordinary JSON: create it with `{ "instanceId": "job-1" }`, keep it on the bridge's temporary filesystem, and let the shutdown hook delete it. It is not a durable cursor, authentication store, or exactly-once mechanism. Put the bridge on a private network or use an independently configured tunnel URL. STH does not own MCP authentication, authorization, public ingress, tunnel lifecycle, or replay.

The trust boundary is sequence API → MCP bridge → caller. Validate caller identity at the bridge, authorize each tool, and keep the sequence route private unless an independently secured gateway protects it. A dropped HTTP or MCP connection loses the in-flight observation; neither topics nor events provide replay.

For the smallest validation, run `npm run docs:check`, then run `cd packages/sequence-test && ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 node ../../scripts/run-ava.js test/phase6-guide-contracts.spec.ts`. For a live bridge, start the Compose file from the configuration guide and poll `GET /api/v1/status` until `ready: true`; do not claim MCP readiness from an arbitrary sleep or from an HTTP listener that has not passed sequence validation.

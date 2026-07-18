---
id: example-mcp-bridged-job-status
slug: /examples/mcp-bridged-job-status
title: Bridging job status to MCP
---

# Bridging job status to MCP

This walkthrough is motivated by [Galaxy/Loom issue #74](https://github.com/galaxyproject/loom/issues/74), where a tool-facing interface needs a job-status surface rather than direct ownership of the worker. It defines the boundary between a sequence HTTP route and an external MCP bridge.

Read [exposing a sequence HTTP API](../sequences/sequence-api-exposure.md) first.

## Sequence endpoint

Prerequisites: Node.js 18+, a packaged sequence, a process-adapter Hub, and the Node MCP SDK in the separately run bridge. The private Compose example runs the Hub; the bridge is a separate process attached to that private network (or reached through an independently secured tunnel). The bridge uses the sequence status response as its source of truth; no additional backing store is required.

```typescript
import type { SequenceAppContext } from "@scramjet/sequence-types";

export async function initialize(this: SequenceAppContext) {
  this.api.use("/status", async () => ({ instanceId: this.instanceId, ready: true }));
}

export default async function (this: SequenceAppContext) {
  await new Promise(() => {});
}
```

The route is registered only after the local prerequisite succeeds. The validation phase is explicit and failures are structured; the pending promise represents the long-running phase after readiness, not a retry mechanism.

The deployable sequence project must include a `package.json` with `"exposePath": "/"` so the Hub can mount the sequence's entire API surface — including the `/status` route — through the instance RPC path:

```json
{
  "name": "job-status-sequence",
  "version": "1.0.0",
  "main": "dist/index.js",
  "engines": { "node": ">=18" },
  "exposePath": "/",
  "dependencies": {
    "@scramjet/sequence-types": "^1.1.0"
  }
}
```

`exposePath` tells the Hub which URL prefix to associate with this instance. A value of `"/"` maps every route registered via `this.api.use(...)` under the Hub's instance RPC namespace at `/api/v1/instance/<instance-id>/rpc/`. Without this field, the Hub cannot forward external requests to the sequence's HTTP server and the status route remains unreachable.

## External MCP bridge

The bridge owns MCP protocol handling and calls the sequence HTTP route. Install the SDK in the bridge project with `npm install @modelcontextprotocol/sdk zod`. This inline bridge validates the requested instance id against the private route before returning status:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Shared-exposure default (single-instance Compose); the runnable workflow below
// overrides SEQUENCE_URL with an instance-scoped path containing the deployed ID.
const hubUrl = process.env.SEQUENCE_URL ?? "http://hub:8000/api/v1/rpc/status";
const server = new McpServer({ name: "job-status-bridge", version: "0.1.0" });

server.registerTool("job_status", {
  description: "Read the bounded status of one running job",
  inputSchema: { instanceId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }
}, async ({ instanceId }) => {
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

Put the bridge on a private network or use an independently configured tunnel URL. STH does not own MCP authentication, authorization, public ingress, tunnel lifecycle, or replay. If a workflow needs durable job correlation, use an application-owned database or queue outside STH and keep that concern separate from this status route.

The trust boundary is sequence API → MCP bridge → caller. Validate caller identity at the bridge, authorize each tool, and keep the sequence route private unless an independently secured gateway protects it. A dropped HTTP or MCP connection loses the in-flight observation; neither topics nor events provide replay.

Maintainers may run the repository contract test and `npm run docs:check` as optional evidence. They do not replace the installed artifact workflow.

## Install and run the deliverable with the Process Adapter

Follow the canonical [installed Sequence setup and run guide](../sequences/setup-and-run.md). Build the status sequence, install its production dependencies, and pack it; package the separate MCP bridge with the SDK dependencies shown above:

### Packaging terminal

```sh
npm install
npm run build
npm install --production
si sequence pack . -o job-status.tar.gz
```

In the separate bridge project, install its dependencies:

```sh
npm install @modelcontextprotocol/sdk zod
```

### Hub terminal

Start the loopback Hub in the foreground with an explicit Process Adapter store:

```sh
mkdir -p sequence-store
sth --runtime-adapter process --hostname 127.0.0.1 --port 8000 --sequences-root "$PWD/sequence-store"
```

### Readiness terminal

Wait for the Hub's actual readiness response:

```sh

timeout 60s sh -c '
  until curl --fail --silent http://127.0.0.1:8000/api/v1/status |
    node -e "let s=\"\"; process.stdin.on(\"data\", c => s += c).on(\"end\", () => process.exit(JSON.parse(s).ready === true ? 0 : 1))";
  do :; done
'
```

### Deploy/start terminal

Deploy the sequence, capture the instance ID from the deploy response, and verify the running instance:

```sh
si config set apiUrl http://127.0.0.1:8000
INSTANCE_ID=$(si sequence deploy ./job-status.tar.gz | node -e "let s=\"\";process.stdin.on(\"data\",c=>s+=c).on(\"end\",()=>console.log(JSON.parse(s).id))")
echo "Deployed instance: $INSTANCE_ID"
si instance info "$INSTANCE_ID"
# Or separate upload and start:
si sequence send ./job-status.tar.gz
INSTANCE_ID=$(si sequence start <sequence-id> | node -e "let s=\"\";process.stdin.on(\"data\",c=>s+=c).on(\"end\",()=>console.log(JSON.parse(s).id))")
si instance info "$INSTANCE_ID"
```

### Sequence API and bridge terminal

Once `$INSTANCE_ID` is set, use the instance-scoped RPC URL to hit the sequence's `/status` route:

```sh
curl --fail "http://127.0.0.1:8000/api/v1/instance/$INSTANCE_ID/rpc/status"
SEQUENCE_URL="http://127.0.0.1:8000/api/v1/instance/$INSTANCE_ID/rpc/status" node bridge.js
```

Live success is Hub `ready: true`, a running instance whose instance RPC path `/api/v1/instance/<id>/rpc/status` returns `{ instanceId, ready: true }`, and an MCP `job_status` response returning the same bounded status for that ID. Keep the bridge private or independently secure; STH does not provide MCP authentication, authorization, tunnel lifecycle, or replay. The Process Adapter runs the sequence as a host child process without container isolation and the Hub terminates it on shutdown. With a Manager, first connect the Hub using the deployment's verified Manager/verser2 configuration, then set the CLI target to the Manager; the Manager routes sequence operations but does not replace the adapter or make the private MCP route public.

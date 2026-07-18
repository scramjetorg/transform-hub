---
id: example-mcp-bridged-job-status
slug: /examples/mcp-bridged-job-status
title: Bridging job status to MCP
---

# Bridging job status to MCP

Use this walkthrough to connect your separately installed MCP bridge to a deployed Sequence that exposes a bounded job-status route.

## Prerequisites

You need Node.js 18+, a packaged sequence, and a Process Adapter Hub. Install the Node MCP SDK in your separate bridge application. Your bridge uses the sequence status response as its source of truth, so you do not need an additional backing store for this workflow.

Read [exposing a sequence HTTP API](../sequences/sequence-api-exposure.md) for the sequence API model.

## Sequence endpoint

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

The deployable sequence project must include a non-empty `exposePath` in `package.json` so the Runner starts the sequence API server. Use a unique path such as `/job-status` when a v1 path-based route is also needed; the supported v2 instance RPC path below selects the instance explicitly:

```json
{
  "name": "job-status-sequence",
  "version": "1.0.0",
  "main": "dist/index.js",
  "engines": { "node": ">=18" },
  "exposePath": "/job-status",
  "dependencies": {
    "@scramjet/sequence-types": "^1.1.0"
  }
}
```

`exposePath` is sequence package metadata used to start and associate the exposed API. Request a selected instance through `POST /api/v2/instances/<instance-id>/rpc/status`; its JSON body is an RPC envelope with the sequence request `method`, `path`, and optional `headers` or `body`. Without `exposePath`, the Hub cannot forward external requests to the sequence's HTTP server and the status route remains unreachable.

## External MCP bridge

Your bridge owns MCP protocol handling and calls the sequence HTTP route. Create `bridge/src/bridge.ts` with this code. It validates the requested instance ID against the private route before returning status:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const hubUrl = process.env.SEQUENCE_URL ?? "http://127.0.0.1:8000/api/v2/instances/instance-id/rpc/status";
const server = new McpServer({ name: "job-status-bridge", version: "0.1.0" });

server.registerTool("job_status", {
  description: "Read the bounded status of one running job",
  inputSchema: { instanceId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }
}, async ({ instanceId }) => {
  const response = await fetch(hubUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      method: "GET",
      path: "/status",
      headers: { accept: "application/json" }
    })
  });
  if (!response.ok) throw new Error(`sequence status HTTP ${response.status}`);
  const rpc = await response.json() as { status: number; body?: unknown };
  if (rpc.status !== 200 || !rpc.body || typeof rpc.body !== "object") {
    throw new Error(`sequence status RPC ${rpc.status}`);
  }
  const status = rpc.body as { ready?: boolean; instanceId?: string };
  if (status.instanceId !== instanceId || status.ready !== true) {
    return { isError: true, content: [{ type: "text", text: "job is not ready" }] };
  }
  return { content: [{ type: "text", text: JSON.stringify({ instanceId, ready: true }) }] };
});

await server.connect(new StdioServerTransport());
```

Create `bridge/package.json` and `bridge/tsconfig.json` alongside that source file:

```json
{
  "private": true,
  "type": "module",
  "scripts": { "build": "tsc -p tsconfig.json" },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^4.7.0"
  }
}
```

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "outDir": "dist",
    "strict": true
  },
  "include": ["src"]
}
```

The trust boundary is sequence API -> MCP bridge -> caller. Your bridge owns authentication, authorization, public ingress, and its deployment boundary. Validate caller identity and authorize each tool in the bridge; keep the sequence route private unless you protect it with an independently secured gateway. If you need durable job correlation, keep it in an application-owned database or queue outside STH.

## Install and run the deliverable with the Process Adapter

Follow the [installed Sequence setup and run guide](../sequences/setup-and-run.md). Build the status sequence, install its production dependencies, and pack it. Package your separate MCP bridge with the SDK dependencies shown above.

### Packaging terminal

```sh
npm install
npm run build
npm install --production
si sequence pack . -o job-status.tar.gz
```

In the separate bridge project, install dependencies and build the documented source file:

```sh
cd bridge
npm install
npm run build
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

Deploy the sequence, capture `INSTANCE_ID` from the deploy response, and verify the running instance:

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

Once `INSTANCE_ID` is set, request the sequence's `/status` route through the v2 instance RPC envelope, then run the built bridge:

```sh
curl --fail --request POST \
  "http://127.0.0.1:8000/api/v2/instances/$INSTANCE_ID/rpc/status" \
  -H 'content-type: application/json' \
  --data '{"method":"GET","path":"/status","headers":{"accept":"application/json"}}'
SEQUENCE_URL="http://127.0.0.1:8000/api/v2/instances/$INSTANCE_ID/rpc/status" node dist/bridge.js
```

The Process Adapter runs the sequence as a Hub child process without container isolation and stops it when the Hub shuts down. With a Manager, connect the Hub using your deployment's verified Manager/verser2 configuration, then target the Manager with the CLI; the Manager routes sequence operations but does not replace the adapter or change your bridge's security responsibilities.

## Local verification (optional)

Confirm that the Hub reports `ready: true`, the v2 RPC envelope returns a `200` status and `{ instanceId, ready: true }` body, and your MCP `job_status` tool returns the same bounded status for that ID.

## What this demonstrates

You can use the supported v2 instance RPC envelope as the bounded input to a separate, buildable MCP bridge. Because the sequence package sets `exposePath`, its `/status` route is available to that instance RPC operation. The bridge can confirm that its requested `instanceId` matches the response before returning the status to an MCP caller. A successful run shows the bridge returning the bounded status for the requested instance ID.

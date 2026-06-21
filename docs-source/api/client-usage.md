---
id: api-client-usage
slug: /api/client-usage
title: API client usage
---

# API client usage

Transform Hub exposes HTTP APIs at the Hub and Manager levels. This page covers the current **v2 API** surface via the `@scramjet/rest-api2` package.

> The legacy v1 API (via `@scramjet/api-client` and the `/api/v1` route tree) remains supported for backwards compatibility. See the [legacy v1 API client documentation](legacy/v1-api-client.md) if you are using the v1 client.

## API surfaces

There are two API surfaces:

- **Hub API** — direct control of a single Hub. Used internally by the Manager and by advanced users for direct Hub access.
- **Manager API** — unified control plane for a fleet of Hubs. This is the primary API for operators.

Both APIs follow RESTful conventions with JSON request and response bodies.

## rest-api2 package

The `@scramjet/rest-api2` package provides schema-generated TypeScript types and client helpers for the current API surface. Its route tree powers the v2 runtime routers and client implementations. The package scope includes:

- Type definitions for API request and response payloads.
- Client helper functions that mirror the v2 API contracts.
- Generic `createRestAPI2Client()` usage with a manifest and transport.
- Fluent clients: `createRootClient`, `createSpaceClient`, `createHubClient`, `createInstanceClient`, and `createFluentClientFromRouteTreeNode`.
- HTTP and verser2 transports exported by `packages/rest-api2/src/client.ts`.

Standalone docs site or server generation from rest-api2 route definitions is a separate concern handled by later documentation phases.

> **Note**: The package is labeled experimental in the curated reference. Its type contracts inform both client and server implementations. The package does not include MCP (Model Context Protocol) features.

### Basic usage

The rest-api2 client is transport-agnostic. Create a client with a manifest and a transport:

```typescript
import { RestAPI2Routes, createHttpClientTransport, createRestAPI2Client } from "@scramjet/rest-api2";

const manifest = RestAPI2Routes.root.router("/api/v2").collect({ expandResolvers: true });
const transport = createHttpClientTransport({ baseUrl: "http://localhost:8000", fetch });
const client = createRestAPI2Client({
  manifest,
  transport,
});

const health = await client.request({ operationId: "GET /api/v2/health" });
```

### Fluent client examples

```typescript
import { createHttpClientTransport, createRootClient } from "@scramjet/rest-api2";

const transport = createHttpClientTransport({ baseUrl: "http://localhost:8000", fetch });
const root = createRootClient({ transport });

// Root-level operations
const spaces = await root.spaces.get();

// Space and Hub traversal
const hub = root.space("space-id").hub("hub-id");
const sequences = await hub.sequences.get();

// Instance-scoped operations
const instance = hub.instance("instance-id");
const health = await instance.health.get();
```

### Transport options

- **HTTP transport** — standard HTTP client for REST API access.
- **Verser2 transport** — experimental transport using the verser2 protocol for Hub-to-Manager communication.

See the generated curated reference for full type signatures and transport configuration.

## When to use which

| Approach | When to use |
|----------|-------------|
| `@scramjet/rest-api2` (v2) | New projects, type-safe client development |
| `@scramjet/api-client` (v1) | Existing deployments using the legacy API |
| Direct HTTP calls | Scripting, quick tests, non-Node.js environments |

## Legacy v1 API

The v1 API (`@scramjet/api-client`, `/api/v1` route tree) remains supported for backwards compatibility. See the [legacy v1 API client documentation](legacy/v1-api-client.md) for details.

## Next steps

- [CLI usage patterns](../cli/usage.md) for command-line interaction.
- [Build and run workflows](../transform-hub/build-run.md) for lifecycle management.
- [Transform Hub core concepts](../transform-hub/core-concepts.md) for API context.
- Generated API reference for complete endpoint documentation.

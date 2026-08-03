v2 REST API contracts, shared handlerless route definitions, Zod schemas, and a manifest-backed common client for Scramjet Transform Hub.

The `@scramjet/rest-api2` package provides the canonical API v2 type contracts and client infrastructure. Its scope includes:

- **Type definitions** — v2 request/response payloads, generic structures, and operation identifiers under the `RestAPI2` namespace.
- **Route definitions** — `RestAPI2RouteSets` and `RestAPI2Routes` for building manifests, including the pre-built `RestAPI2Routes` router tree for root, space, hub, and instance nodes.
- **Generic client** — `createRestAPI2Client()` using a `RouteManifest` and `ApiClientTransport`.
- **Fluent clients** — `createRootClient`, `createSpaceClient`, `createHubClient`, `createInstanceClient`, and `createFluentClientFromRouteTreeNode` for typed traversal of the route tree.
- **Transports** — `createHttpClientTransport` for HTTP access and `createVerser2ClientTransport` for verser2 protocol access.

## When to use

Use `@scramjet/rest-api2` when you need to interact with Transform Hub programmatically using the current v2 API contract. This package is the primary API client library for new integrations. It is transport-agnostic and can be used in Node.js and browser environments (when using the HTTP transport with a `fetch` polyfill).

For existing integrations using the legacy v1 API, see [@scramjet/api-client](../api-client/README.md).

## Quick start

```typescript
import {
  RestAPI2Routes,
  createHttpClientTransport,
  createRestAPI2Client,
  createRootClient
} from "@scramjet/rest-api2";

const manifest = RestAPI2Routes.root
  .router("/api/v2")
  .collect({ expandResolvers: true });

const transport = createHttpClientTransport({
  baseUrl: "http://localhost:8000",
  fetch
});

// Generic client
const client = createRestAPI2Client({ manifest, transport });
const health = await client.request({
  operationId: "GET /api/v2/health"
});

// Fluent client
const root = createRootClient({ transport });
const spaces = await root.spaces.get();
const hub = root.space("space-id").hub("hub-id");
const sequences = await hub.sequences.get();
const inst = hub.instance("instance-id");
const instHealth = await inst.health.get();
```

## Stability

This package is labeled **experimental** in the curated reference. Its type contracts inform both client and server implementations. MCP (Model Context Protocol) is an external integration outside this package's client and server contracts.

## See also

- [API client usage](../../docs-source/api/client-usage.md) for conceptual usage and examples.
- [Legacy v1 API client](../../docs-source/api/legacy/v1-api-client.md) for backwards-compatible `@scramjet/api-client` usage.

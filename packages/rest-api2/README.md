# @scramjet/rest-api2

V2 REST API contracts, shared handlerless route definitions, Zod schemas, and the common manifest-backed client for Scramjet Transform Hub.

This package exports new `RestAPI2.*` public contracts only. It must not alias or re-export legacy `MMRestAPI`, `MRestAPI`, or `STHRestAPI` contracts.

## Public Contracts

The `RestAPI2` namespace defines all v2 request/response types, generic structures, and operation identifiers used by route definitions, OpenAPI output, and the common client.

### Generic Structures

| Contract | Purpose |
|---|---|
| `RestAPI2.Empty` | Empty request object (explicit alternative to `void`). |
| `RestAPI2.IdParams<TScope>` | Path identifiers for a scope such as `Root`, `Space`, `Hub`, etc. |
| `RestAPI2.ListQuery<TItem>` | Pagination, filtering, sorting, and stream-range selection. |
| `RestAPI2.ListResponse<TItem>` | `{ items: TItem[]; page?: PageInfo; stream?: StreamInfo; links?: Links }`. |
| `RestAPI2.OpResponse<TOutput>` | `{ operation: Operation; result?: TOutput; error?: ErrorBody }`. |
| `RestAPI2.NoContent<Status>` | Empty body with indicated HTTP status. |
| `RestAPI2.StreamRange` | Parsed `Content-Range` request span or time range. |
| `RestAPI2.StreamInfo` | Response metadata for ranged or live stream reads. |
| `RestAPI2.StreamDescriptor<TItem>` | Describes a streamable endpoint and item contract. |
| `RestAPI2.ErrorBody` | v2 error envelope, independent from v1 error DTOs. |

### Common Client

One client surface for all API levels, sharing the same operation contracts over HTTP and verser2 transports:

| Contract | Purpose |
|---|---|
| `RestAPI2.Client` | Common typed client for all v2 operations. |
| `RestAPI2.ClientTransport` | Transport contract implemented by HTTP and verser2 adapters. |
| `RestAPI2.ClientRequest<TOperation>` | Typed request envelope. |
| `RestAPI2.ClientResponse<TOperation>` | Typed response envelope. |
| `RestAPI2.OperationId` | Stable operation identifier shared by route definitions, OpenAPI, and client. |

### Specific Models

See full details in `docs/api.md` — key models include `RestAPI2.Root`, `RestAPI2.Space`, `RestAPI2.Hub`, `RestAPI2.Sequence`, `RestAPI2.Instance`, `RestAPI2.Topic`, `RestAPI2.StoreItem`, `RestAPI2.LogRecord`, `RestAPI2.AuditRecord`, `RestAPI2.HealthCheckInfo<TScope>`, and operation-specific payloads such as `RestAPI2.DeleteInstancePayload` and `RestAPI2.InstanceParametersPatch`.

## Common Client Construction

Build the client from a route manifest and a transport:

```ts
import { createHttpClientTransport } from "@scramjet/api-router";
import { createRestAPI2Client } from "@scramjet/rest-api2";

const transport = createHttpClientTransport({
    baseUrl: "http://localhost:8000",
    fetch: globalThis.fetch
});

const client = createRestAPI2Client({ manifest, transport });
const response = await client.request({
    operationId: "GET /api/v2/health",
    params: {},
    query: {}
});
// response.operationId === "GET /api/v2/health"
// response.status, response.headers, response.body
```

## Fluent Client Construction

The preferred public client can be constructed at Root, Space, Hub, or Instance level. Fluent calls dispatch through the same manifest client and transport stack as `createRestAPI2Client`.

```ts
import { createRootClient, createHubClient } from "@scramjet/rest-api2";

const root = createRootClient({ transport });

await root.health.get();
await root.space("space-1").health.get();
await root.space("space-1").hub("hub-1").health.get();
await root.space("space-1").hub("hub-1").instance("inst-1").health.get();

const hub = createHubClient({ transport, basePath: "/" });

await hub.health.get();
```

## HTTP Client Transport Setup

```ts
import { createHttpClientTransport } from "@scramjet/api-router";

const transport = createHttpClientTransport({
    baseUrl: "http://localhost:8000",
    fetch: globalThis.fetch
});
// Params materialize into path, query appended as ?key=val, body JSON-serialized.
```

## Verser2 Client Transport Setup

```ts
import { createVerser2ClientTransport } from "@scramjet/api-router";

const transport = createVerser2ClientTransport(broker);
// Delegates each request to the broker's request() method.
```

Both transports are owned by `@scramjet/api-router`; `@scramjet/rest-api2` re-exports them for compatibility.

### Custom Fluent Clients and Opaque RPC

The fluent client model is derived from route tree nodes. Built-in clients cover Root, Space, Hub, and Instance levels. Custom extensions can provide a RestAPI2-compatible route tree node:

```ts
import { Router } from "@scramjet/api-router";
import { createFluentClientFromRouteTreeNode } from "@scramjet/rest-api2";

const custom = createFluentClientFromRouteTreeNode({
    concept: "extension",
    owner: "extension",
    routes: () => ({ inspect: Router.get("/inspect") })
}, { basePath: "/api/v2/extensions/example", transport });

await custom.inspect.get();
```

RPC route groups are explicit opaque exceptions. They remain available as route contracts, but are intentionally omitted from standard Instance fluent clients because sequence-provided RPC surfaces can be dynamic.

## Shared Handlerless Route Sets

Pre-defined route contracts live under `RestAPI2RouteSets` and `RestAPI2Routes`. These are handlerless — runtime implementations bind handlers locally.

```ts
import { RestAPI2RouteSets, RestAPI2Routes } from "@scramjet/rest-api2";

// Typed contract keys for each API level:
RestAPI2RouteSets.root.routes();         // { version, info, load, spaces, health, trust, audit }
RestAPI2RouteSets.space.routes();        // { version, config, trust, load, hubs, instances, ... }
RestAPI2RouteSets.hub.hubRoutes();       // { load, version, config, health, status, sequences, ... }
RestAPI2RouteSets.hub.sequenceRoutes();  // { sendSequence, updateSequence, deleteSequence, ... }
RestAPI2RouteSets.instance.routes();     // { info, deleteInstance, stdio, health, logs, ... }

// Pre-built routers with resolver definitions:
RestAPI2Routes.root.router();        // Root routes + Space resolver
RestAPI2Routes.space.router();       // Space routes + Hub resolver
RestAPI2Routes.hub.router();         // Hub routes + sequence routes + Instance resolver
```

### Typed Route Binding

Bind runtime handlers to handlerless contract sets using `bindRoutes`/`bindResolvers` from `@scramjet/api-router`:

```ts
import { bindRoutes, bindResolvers, routeBinding, resolverBinding } from "@scramjet/api-router";
import { RestAPI2RouteSets } from "@scramjet/rest-api2";

const router = bindRoutes(RestAPI2RouteSets.hub.hubRoutes(), {
    load: routeBinding.handler(async (req) => ({ load: await host.getLoad() })),
    version: routeBinding.handler(() => ({ version: "1.0.0" })),
    config: routeBinding.handler(() => ({ config: host.publicConfig })),
    // ...
});
```

Binding variants:
- `routeBinding.handler(fn)` — provide a handler with types inferred from the contract.
- `routeBinding.skip(reason)` — omit the route entirely.
- `routeBinding.contractOnly(reason)` — register schema-only (no handler).
- `resolverBinding.handler(fn)` — bind a resolver.

Missing, extra, or wrong-typed handlers fail at compile time.

## Adding a v2 Endpoint

1. Add the Zod request/response schemas in `schemas.ts` when a new DTO is needed.
2. Add the route once in the relevant route-set factory in `routes.ts` under `RestAPI2RouteTree` ownership.
3. Bind the route in the owning runtime package (`host`, `manager`, or `multi-manager`) with `bindRoutes()` or explicitly document it as `contractOnly()` / `skip()`.
4. Add fluent client and route-set tests when the endpoint should be part of the standard public client. Opaque/dynamic RPC escapes must be declared in route group metadata.
5. OpenAPI/schema-mode output and resolver-expanded manifests derive from the same route tree.

## Zod Schema Patterns

Exported as `RestAPI2Schemas` and individual named schemas in `packages/rest-api2/src/schemas.ts`:

```ts
import { z } from "zod";
import { listResponse, opResponse, healthCheckInfo } from "@scramjet/rest-api2";

const MyPayload = z.object({ name: z.string(), count: z.number().int().min(0) });
const MyResponse = opResponse(z.object({ id: z.string() }));
const MyListResponse = listResponse(MyPayload);
```

Key schema factories:
- `listResponse(itemSchema)` — `{ items: T[], page?: PageInfo, stream?: StreamInfo }`.
- `opResponse(resultSchema)` — `{ operation: Operation, result?: T, error?: ErrorBody }`.
- `healthCheckInfo(scopeSchema, componentSchema?)` — componentized health output.

FD param schemas for stdio routes:
- `readableFdParam` — `fd: 1 | 2` (stdout/stderr read).
- `writableFdParam` — `fd: 0` (stdin write).
- `anyFdParam` — `fd: 0 | 1 | 2`.

## Zod Schemas

The package exports a full set of Zod DTO schemas matching the `RestAPI2.*` contract shapes:

```ts
import { Hub, Instance, Sequence, Topic, LogRecord, AuditRecord, InstanceResponse, DeleteInstancePayload, EventMessage, RpcRequest } from "@scramjet/rest-api2";
```

These are used by shared route contract definitions in `RestAPI2Routes` and are available for custom route definitions, client-side validation, and OpenAPI generation.

## Fixture-Based Client Testing

Package tests (in `packages/rest-api2/test/`) prove that one common client can address all operation identifiers. Use `createRestAPI2Client` with a mock transport or probe for unit tests:

```ts
import { createRestAPI2Client } from "@scramjet/rest-api2";
import { createClientRequestProbe } from "@scramjet/api-router/test/lib/no-circumvention";

const probe = createClientRequestProbe({
    async request(req) {
        return { status: 200, headers: {}, body: {} };
    }
});
const client = createRestAPI2Client({ manifest, transport: probe.transport });
const response = await client.request({ operationId: "GET /api/v2/health" });
probe.assertUsed();
```

## No-Circumvention Rules

When migrating BDD or package tests to the common client:

1. Use `createRestAPI2Client` — do not construct raw HTTP/verser2 calls for migrated endpoints.
2. Wrap the transport with a `createClientRequestProbe` to prove real requests.
3. Transport-level tests (testing `createHttpClientTransport` itself) are exempt.
4. Do not import production-internal request helpers from packages under test.

## Migration Notes

- **No legacy aliasing**: This package must not export or alias `MMRestAPI`, `MRestAPI`, or `STHRestAPI`. Those contracts belong to `@scramjet/types` for v1 compatibility only.
- **Owner-local handling**: Route contracts are handlerless by design. Each package (`host`, `manager`, `multi-manager`) imports shared contracts and binds local handlers with `bindRoutes`/`bindResolvers`. No package imports another runtime package for route schemas.
- **Deferred content-range**: Full `Content-Range` negotiation (time range, span range, `206` vs `200`, `ReadableStream` vs `ListResponse`) is documented in `docs/api.md`. Runtime implementation of range-dependent response switching is deferred — stream routes currently register as `kind: "upstream"` / `kind: "downstream"` boundaries.
- **Storage proxy v2 typing**: Space storage object read/write/delete is a documented WebDAV/S3-compatible proxy compatibility surface implemented by the Manager package. Strong v2 typing and storage compatibility guarantees are intentionally deferred.
- **V1 compatibility**: All `/api/v1` routes remain registered with unchanged client-visible behavior. Compatibility adapters may unwrap v2 handler results for low-risk v1 read routes only when separate v1 tests assert exact response preservation.

## Exports

```
@scramjet/rest-api2
├── RestAPI2.* contracts (namespace)
├── RestAPI2.Client, ClientTransport, ClientRequest, ClientResponse
├── RestAPI2RouteTree        — Root → Space → Hub → Instance public hierarchy
├── RestAPI2RouteSets        — typed handlerless contract sets
│   ├── root.{routes, resolvers}
│   ├── space.{routes, resolvers}
│   ├── hub.{hubRoutes, sequenceRoutes, resolvers}
│   ├── sequence.{routes}
│   └── instance.{routes}
├── RestAPI2Routes           — pre-built handlerless routers
│   ├── root.router
│   ├── space.router
│   ├── hub.{router, hubRouter, sequenceRouter}
│   ├── sequence.router
│   └── instance.router
├── createRestAPI2Client     — common client factory
├── createRootClient, createSpaceClient, createHubClient, createInstanceClient
├── createFluentClientFromRouteTreeNode — custom route-tree client factory
├── createHttpClientTransport, createVerser2ClientTransport
├── ApiClientTransport (type)
├── Zod DTO schemas
│   ├── Hub, Instance, Sequence, Entity, Topic, StoreItem, ...
│   ├── InstanceResponse, DeleteInstancePayload, RpcRequest, ...
│   ├── listResponse, opResponse, healthCheckInfo
│   ├── RestAPI2Schemas
│   ├── readableFdParam, writableFdParam, anyFdParam
│   └── ... per-operation request/response schemas
└── getRestAPI2Route         — route lookup helper (compatibility)
```

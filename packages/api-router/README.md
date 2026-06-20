# @scramjet/api-router

Schema-aware route declaration, manifest, and client contract package for Scramjet Transform Hub.

This package is introduced by the API revamp track as the foundation for:

- decorator and imperative route declarations;
- Zod-first request and response schemas;
- route manifests shared by runtime execution, OpenAPI generation, and client construction;
- HTTP and verser2 transport contracts for a generic API client;
- a typed bind helper for enforcing handlerless route contracts at compile time.

The package is intentionally framework-neutral at the core. Existing `@scramjet/api-server` integration is implemented as an adapter around the exported route manifest and execution contracts.

## Decorator Usage

Decorate a class with `@Api` for base path and `@Route` (or shorthand `@Get`, `@Post`) for individual endpoints:

```ts
import { Api, Get, Post, Route, collectDecoratedRoutes } from "@scramjet/api-router";

@Api("/api/v2")
class HealthRoutes {
    @Get("/health", { description: "Health check", schemas: { response: z.object({ ok: z.boolean() }) } })
    health() {
        return { ok: true };
    }

    @Route("post", "/echo", { schemas: { body: z.object({ msg: z.string() }) } })
    echo(request: { body: { msg: string } }) {
        return { echoed: request.body.msg };
    }
}

// Collect into a RouterDefinition:
const router = collectDecoratedRoutes(HealthRoutes);
// or: Router.api(HealthRoutes)
```

## Imperative Usage

Create a `RouterDefinition` with `Router.create()` and add routes with `.get()`, `.post()`, `.route()`:

```ts
import { Router, createRouter } from "@scramjet/api-router";

const router = Router.create({ basePath: "/api/v2" });
// -- or equivalently --
const router = createRouter({ basePath: "/api/v2" });

router.get("/health", {
    description: "Health check",
    schemas: { response: z.object({ ok: z.boolean() }) },
    handler: () => ({ ok: true })
});

router.post("/echo", {
    schemas: { body: z.object({ msg: z.string() }) },
    handler: (request) => ({ echoed: request.body.msg })
});
```

### Static Mounting

Mount a child router under a prefix. Child routes keep relative paths; composed full paths appear in manifests:

```ts
const child = createRouter().get("/status", { handler: () => ({ status: "ok" }) });
const parent = createRouter({ basePath: "/api/v2" }).mount("/instances/:instanceId", child);
// Composed full path: GET /api/v2/instances/:instanceId/status
```

### Dynamic Resolve

Use `resolve` for runtime delegation — e.g., selecting an instance's local v2 router:

```ts
router.resolve("/instances/:instanceId", {
    schemas: { params: z.object({ instanceId: z.string() }) },
    handler: (request) => {
        const instance = store.get(request.params.instanceId);
        return instance ? { local: instance.v2Router } : undefined;
    }
});
```

Resolvers return `{ local: LocalRouterTarget }` for in-process dispatch, `{ redirect: ResolverRedirectTarget }` for verser2 routing, or `undefined` for 404.

### Cross-Node Resolver Redirects

For routes owned by a different process (e.g. Manager → Hub), resolvers return redirect targets:

```ts
router.resolve("/hubs/:hubId", {
    schemas: { params: z.object({ hubId: z.string() }) },
    handler: (request) => ({
        redirect: {
            routeDomain: hub.routeDomain,
            targetPath: `/api/v2/${request.remainingPath}`
        }
    })
});
```

The HTTP adapter emits a `308` response with `location`, `x-scramjet-route-decision`, `x-scramjet-route-domain`, and `x-scramjet-route-target-path` headers.

## Zod Schema Patterns

Route schemas are defined as a `RouteSchemas` object with optional `params`, `query`, `headers`, `body`, and `response` Zod schemas:

```ts
const schemas = {
    params: z.object({ id: z.string() }),
    query: z.object({ page: z.coerce.number().int().optional() }),
    headers: z.object({ authorization: z.string().optional() }),
    body: z.object({ name: z.string() }),
    response: z.object({ id: z.string(), name: z.string() })
};
```

Validation is explicit — call `validateRouteRequest(schemas, raw)` and `validateRouteResponse(schemas, data)`:

```ts
import { validateRouteRequest, validateRouteResponse, RouteValidationError } from "@scramjet/api-router";

try {
    const validated = validateRouteRequest(schemas, { body: { name: "test" } });
    const output = validateRouteResponse(schemas, { id: "abc", name: "test" });
} catch (err) {
    if (err instanceof RouteValidationError) {
        console.error(err.location, err.issues); // e.g. "body", [ZodIssue]
    }
}
```

Handler types are inferred from schemas:

```ts
type Req = RouteRequest<typeof schemas>;   // { params: { id: string }; body: { name: string }; ... }
type Res = RouteResponse<typeof schemas>;  // { id: string; name: string }
```

The adapter layer (`registerHttpRoutes`) runs validation automatically when schemas are present; handlers receive already-validated data.

## Hook Pipeline

Hooks intercept request processing at `before`, `after`, `error`, and `finally` stages:

```ts
import { headerHook, corsHook, requestLoggingHook, executeRoutePipeline, RouteHook } from "@scramjet/api-router";

const loggingHook = requestLoggingHook((msg, details) => logger.info(msg, details));

router.get("/secure", {
    hooks: [corsHook({ origin: "https://example.com" }), headerHook({ "x-frame-options": "DENY" })],
    handler: () => ({ secure: true })
});

// Custom hook:
const authHook: RouteHook = {
    name: "auth",
    before(context) {
        if (!context.request.headers?.authorization) {
            throw new Error("Unauthorized");
        }
    }
};
```

Built-in hook factories:
- `headerHook(headers)` — appends response headers via `context.state.headers`.
- `corsHook({ origin, methods, headers })` — convenience over `headerHook` for CORS headers.
- `requestLoggingHook(logFn)` — logs method and path in the `before` stage.

Hooks compose: router-level hooks run before route-level hooks of the same stage.

## Route Manifest and Collection

Call `.collect()` on a `RouterDefinition` to produce a serializable `RouteManifest`:

```ts
const manifest = router.collect();
// { basePath: "/api/v2", routes: [{ id, method, fullPath, schemas, ... }], resolvers: [...] }
```

`collect()` rejects duplicate routes (by operation ID or method+path). Static mounts expand child routes into the manifest.

### Resolver-Expanded Manifests

Pass `{ expandResolvers: true }` to include virtual routes from resolver target definitions:

```ts
const expanded = router.collect({ expandResolvers: true });
// Virtual routes get composed public paths such as
// GET /api/v2/spaces/:spaceId/hubs/:hubId/load
```

Default `collect()` and runtime registration do **not** expand resolver virtual routes — registrations stay local.

## OpenAPI 3.1 Generation

Generate an OpenAPI 3.1 document from any collected manifest:

```ts
import { generateOpenApi } from "@scramjet/api-router";

const doc = generateOpenApi(manifest, { title: "Scramjet API", version: "2.0.0" });
console.log(JSON.stringify(doc, null, 2));
```

Route `schemas.params`, `schemas.query`, `schemas.headers`, `schemas.body`, and `schemas.response` are converted to JSON Schema using a lightweight Zod converter (supports `z.string`, `z.number`, `z.boolean`, `z.array`, `z.object`, `z.optional`).

### Schema Mode CLI

The `scramjet-api-router-generate` binary loads an API definition file in safe schema mode — no servers or side effects:

```bash
npx scramjet-api-router-generate path/to/api-definition.ts
npx scramjet-api-router-generate path/to/api-definition.ts --output openapi.json
```

Schema mode loads named `manifest`, `default`, or `collect` exports from the module:

```ts
import { loadManifestFromSchemaModule } from "@scramjet/api-router";
```

## HTTP Registration

Register collected routes on the existing `@scramjet/api-server` `APIRoute` surface:

```ts
import { registerHttpRoutes } from "@scramjet/api-router";

const api: APIRoute = server.createRoute();
registerHttpRoutes(api, router);
// GET /health → api.get("/api/v2/health", handler)
// POST /echo → api.op("post", "/api/v2/echo", handler)
```

The adapter maps:
- `kind: "request"` → `.get()` or `.op()` depending on method.
- `kind: "upstream"` → `.upstream()` for readable streams.
- `kind: "downstream"` → `.downstream()` for writable streams.
- `kind: "duplex"` → `.duplex()` for bidirectional streams.
- Resolver paths → `.use()` prefix middleware for dynamic dispatch.

Existing `@scramjet/api-server` safe handler wrapping, CORS/OPTIONS, logging, and body parsing remain owned by the api-server layer.

## Verser2 Registration

Register the same route definitions for verser2 broker execution:

```ts
import { registerVerser2Routes, Verser2RouteAdapter } from "@scramjet/api-router";

const adapter: Verser2RouteAdapter = broker.createRouteAdapter();
registerVerser2Routes(adapter, router);
```

The verser2 adapter creates a `Verser2RouteRegistration` for each collected route with a `handle(request)` method that runs validation and returns `{ status, body }`.

## Generic Client Construction

Build a typed client from a `RouteManifest` and any `ApiClientTransport`:

```ts
import { createApiClient, ApiClient } from "@scramjet/api-router";

const client = createApiClient(manifest, transport);
const response = await client.request("GET /api/v2/health");
// { status: 200, headers: {...}, body: { ok: true } }
```

Route IDs follow the pattern `METHOD /full/path`. Unknown route IDs throw `UnknownRouteError`.

## HTTP Client Transport

```ts
import { createHttpClientTransport } from "@scramjet/api-router";

const transport = createHttpClientTransport({
    baseUrl: "http://localhost:8000",
    fetch: globalThis.fetch
});

const client = createApiClient(manifest, transport);
const res = await client.request("GET /api/v2/health");
```

Params materialize into the URL path; query values append as `?key=value`; body is JSON-serialized.

## Verser2 Client Transport

```ts
import { createVerser2ClientTransport } from "@scramjet/api-router";

const transport = createVerser2ClientTransport(broker);
const client = createApiClient(manifest, transport);
```

The verser2 transport delegates each `request` to the broker's `request` method with the same `ApiClientRequest` shape.

## Typed Route Binding (Compile-Time Contract Enforcement)

Bind runtime handlers to handlerless shared route contracts. Missing or extra handler keys, wrong param/body types, or wrong response shapes fail at compile time:

```ts
import { bindRoutes, bindResolvers, routeBinding, resolverBinding } from "@scramjet/api-router";
import { RestAPI2RouteSets } from "@scramjet/rest-api2";

const router = bindRoutes(RestAPI2RouteSets.hub.hubRoutes(), {
    load: routeBinding.handler(async (req) => ({ load: await host.getLoad() })),
    version: routeBinding.handler(() => ({ version: "1.0.0" })),
    config: routeBinding.handler(() => ({ config: host.publicConfig })),
    health: routeBinding.contractOnly("schema only, runtime handled by adapter"),
    // ...
});
```

Available binding variants:
- `routeBinding.handler(fn)` — provide a runtime handler; types are inferred from the contract.
- `routeBinding.skip(reason)` — omit the route entirely.
- `routeBinding.contractOnly(reason)` — register the schema-only route without a handler (for adapters that supply their own).
- `resolverBinding.handler(fn)` — bind a resolver with inferred params.

`resolverBinding.handler` and `routeBinding.handler` accept either a bare function or `{ handler: fn, id?: string, description?: string }` for per-binding metadata overrides.

## Fixture-Based Client Testing

The package provides test fixtures under `packages/api-router/test/lib/` for no-circumvention testing (not exported as production API):

```ts
import { createClientRequestProbe, ClientRequestProbeError } from "../test/lib/no-circumvention";

// Wrap any transport with a request counter:
const probe = createClientRequestProbe(transport);
const client = createApiClient(manifest, probe.transport);

// Assert that at least one request was made:
probe.assertUsed();
// Assert that no requests were made:
probe.assertNotUsed();
```

Migrated API and BDD tests should use the generic client and include no-circumvention probes to verify real request issuance and prevent test bypasses.

## No-Circumvention Rules

When migrating API tests or BDD steps to the generic client:

1. **Use `createApiClient` or `createRestAPI2Client`** — do not construct raw `fetch()` or `http.request()` calls for migrated endpoints.
2. **Wrap transports with a `createClientRequestProbe`** in package tests to assert the client was actually called.
3. **Transport-level tests** (e.g., testing `createHttpClientTransport` behavior) are exempt; all other tests must go through the client.
4. **Do not import production-internal request helpers** from packages under test — use the public `ApiClientTransport` interface.
5. **BDD step definitions** for migrated API surfaces must use the common client, not direct `http` or `@scramjet/verser` calls.

## Migration Notes

- **v1 compatibility**: Existing `/api/v1` route shapes remain externally compatible. Low-risk v1 routes may be backed by v2 handlers through compatibility adapters when dedicated v1 tests prove exact response preservation. v2 routes live in separate v2 test files.
- **v2 route sections**: Implemented in `@scramjet/rest-api2` shared handlerless contracts. Host, Manager, and MultiManager implementations bind handlers locally using `bindRoutes`/`bindResolvers`.
- **Deferred content-range handling**: v2 stream/list `Content-Range` semantics (time range, span range, `206 Partial Content` vs `200 OK`, `ReadableStream` vs `ListResponse`) are documented in `docs/api.md` but the runtime implementation of full range negotiation is deferred. Stream endpoints currently register as `kind: "upstream"` / `kind: "downstream"` route boundaries and rely on the existing v1 streaming behavior.

## Package Exports

```
@scramjet/api-router
├── Router, createRouter          — imperative route builder
├── Api, Route, Get, Post          — decorators
├── collectDecoratedRoutes, Router.api — decorator-to-manifest
├── RouteDefinition, RouteSchemas, RouteManifest — types
├── defineRoute                    — typed route factory
├── validateRouteRequest/Response, RouteValidationError — validation
├── executeRoutePipeline, RouteHook, headerHook, corsHook, requestLoggingHook — hooks
├── registerHttpRoutes             — HTTP adapter
├── registerVerser2Routes          — verser2 adapter
├── createApiClient, ApiClient, ApiClientTransport — generic client
├── createHttpClientTransport      — HTTP transport
├── createVerser2ClientTransport   — verser2 transport
├── generateOpenApi                — OpenAPI 3.1 generation
├── loadManifestFromSchemaModule, SchemaModule — schema mode
├── bindRoutes, bindResolvers, routeBinding, resolverBinding — typed binding
├── RouterDefinition.mount, .resolve — mount/resolve primitives
└── RawHttpRouteRequest            — typed raw HTTP context for stream handlers
```

# Specification: API v2 Final Structure and Fluent Client

## Overview

Finalize the public v2 API structure and typed client model for Scramjet Transform Hub by making `RestAPI2RouteTree` the single source of truth for public v2 route contracts, typed route sets, runtime router construction, resolver expansion, OpenAPI generation, fluent client construction, and v2 implementation coverage checks.

The public v2 API must use product concepts rather than implementation class names. Public v2 concepts are:

- **Root**: the top-level API entrypoint and controller surface.
- **Space**: the public concept currently implemented by Manager internals.
- **Hub**: the public concept currently implemented by Host internals.
- **Instance**: the runtime sequence instance concept.

The track must replace public v2 `manager`/`managerId` terminology with `space`/`spaceId`, and public v2 `host` terminology with `hub` where applicable. Internal implementation packages and classes may continue to use Manager, MultiManager, and Host names. There are no external users of the current v2 API, so the track should straight-replace public v2 paths, route IDs, contracts, generated docs, examples, and tests instead of preserving public `/api/v2/managers/...` aliases.

The track also includes a deliberate tree-shaking phase for old v2-related code, helpers, aliases, libraries, or exports that become unnecessary after the final route tree and fluent client are in place. Removals must be preceded by an explicit user interview/approval checkpoint before deleting public or semi-public code.

## Goals

- Make route sets the single source of truth for v2 route contracts, fluent clients, runtime routers, expanded manifests, OpenAPI, and implementation coverage checks.
- Introduce a fully typed `RestAPI2RouteTree` covering every public v2 API level.
- Provide typed route-set accessors for every level: Root, Space, Hub, Sequence, Instance, and supporting groups such as Topics, Storage, StdIO, Events, RPC, Logs, and Audit.
- Provide fluent typed clients constructible at every level, including Root, Space, Hub, and Instance clients.
- Keep the existing generic manifest client and HTTP/verser2 transports as the low-level execution base.
- Wire current router construction into the route tree so runtime routers are derived from the same route source used by clients and OpenAPI.
- Add compile-time guards proving route implementations and fluent clients cover every route unless explicitly allowed as RPC/custom dynamic behavior.
- Replace public v2 Manager/Host wording with Space/Hub wording across route contracts, docs, generated OpenAPI, route IDs, and client APIs.
- Identify and remove obsolete v2-related libraries/surfaces only after a user interview confirms removal scope.
- Update `docs/api.md` and package docs to describe Root/Space/Hub/Instance concepts and remove public Manager/Host wording from v2 API documentation.

## Functional Requirements

### Route Tree as Single Source of Truth

- Add a typed `RestAPI2RouteTree` under `@scramjet/rest-api2`.
- The route tree must define the public hierarchy:
  - Root routes and the `space(spaceId)` resolver/child.
  - Space routes and the `hub(hubId)` resolver/child.
  - Hub routes, Sequence routes, Topic routes, Audit/Log routes, and the `instance(instanceId)` resolver/child.
  - Instance routes, including info, health, parameters, lifecycle, stdio, events, input/output, logs, monitoring, and RPC boundaries.
- Existing `RestAPI2RouteSets` and `RestAPI2Routes` exports should be derived from the route tree rather than becoming a second manually maintained source.
- Route definitions must preserve Zod schemas for params, query, headers, body, and response types so downstream client and implementation typing can infer exact shapes.
- Runtime route collection must continue to support resolver expansion for public nested paths without registering virtual routes as local handlers.

### Public v2 Concept Rename

- Replace public v2 API paths using `managers` with `spaces`.
- Replace public v2 route params using `managerId` with `spaceId`.
- Replace public v2 contract names, route IDs, operation IDs, generated OpenAPI paths, examples, and docs that expose Manager as a public v2 concept with Space terminology.
- Replace public v2 Host terminology with Hub terminology where it appears in route contracts, generated docs, and client-facing APIs.
- Internal implementation names, packages, files, and classes may remain `manager`, `multi-manager`, and `host` where they describe implementation ownership.
- No public `/api/v2/managers/...` compatibility aliases are required in this track.

### Fluent Typed Clients

- Add a fluent client API derived from `RestAPI2RouteTree` rather than hand-written separately.
- Provide direct client factories at every public level where a caller may already know the base endpoint:
  - `createRootClient(...)`
  - `createSpaceClient(...)`
  - `createHubClient(...)`
  - `createInstanceClient(...)`
- The preferred fluent usage should include examples such as:

```ts
const root = createRootClient({ baseUrl, transport });
const rootHealth = await root.health.get();

const spaceHealth = await root.space("space-1").health.get();
const hubHealth = await root.space("space-1").hub("hub-1").health.get();
const instanceHealth = await root.space("space-1").hub("hub-1").instance("inst-1").health.get();
```

- Direct level clients should also work, for example:

```ts
const hub = createHubClient({ baseUrl: "http://hub/api/v2", transport });
const health = await hub.health.get();
```

- Fluent clients must infer response bodies from route response schemas, for example `hub.health.get()` should produce a typed `RestAPI2.HealthCheckInfo<RestAPI2.Hub>` response body.
- Fluent clients must infer request params, query, headers, and body from route schemas.
- Fluent clients must internally dispatch through the existing generic client, route manifests, and HTTP/verser2 transports instead of adding a separate transport stack.

### Typechecked Runtime Routers

- Runtime v2 handlers in Host, Manager, and MultiManager implementation packages must bind against route tree-derived route sets.
- Adding a new route to a route set must cause a TypeScript error in the owning runtime implementation unless the route is explicitly handled by a typed handler or explicitly marked as an allowed exception.
- Existing `bindRoutes`, `bindResolvers`, `routeBinding`, and `resolverBinding` patterns should be reused or extended to enforce exact route coverage.
- Type-level tests must prove missing handlers, extra handlers, wrong params/body/query usage, and wrong response shapes fail.

### Typechecked Fluent Client Coverage

- Adding a new route to a route set must cause a TypeScript error in the fluent client mapping unless the route is intentionally dynamic/opaque.
- The client builder must not maintain a second route hierarchy by hand. It must derive endpoint methods from the route tree and route definitions.
- Runtime tests should compare expanded route manifests against fluent client operation coverage where compile-time checks cannot directly prove coverage.

### RPC and Custom Route Tree Exceptions

- RPC endpoints may remain explicitly opaque/dynamic because the exposed route set may not be known ahead of time.
- The route tree/client model must leave room for sequences or extensions to provide their own RestAPI2-compatible route tree and construct a typed custom client from it.
- Opaque RPC escapes must be explicit in route metadata and documentation; they must not silently bypass route coverage checks for normal endpoints.

### Tree-Shaking and Old v2 Surface Removal

- Inventory old v2-related libraries, helpers, aliases, route builders, compatibility exports, test helpers, and docs that become unnecessary after the final route tree and fluent client are in place.
- Classify each candidate as one of:
  - remove now;
  - keep as low-level generic infrastructure;
  - keep as temporary compatibility until a later track;
  - uncertain and requiring user decision.
- Conduct a user interview before removing old v2-related public or semi-public code. The interview must present the candidate list, risk level, and recommended action.
- Only remove code after explicit user approval.
- Do not remove the low-level generic manifest client, HTTP transport, verser2 transport, route manifest generation, schema-mode loading, or OpenAPI generation unless the user explicitly approves a replacement.
- Add tests/typechecks proving removed exports are not used by current packages.

### Documentation and OpenAPI

- Update `docs/api.md` to reflect the final public v2 structure and terminology: Root, Space, Hub, Instance.
- Remove public v2 `manager`, `managerId`, and implementation `host` terminology from API docs, examples, generated OpenAPI paths, and public operation IDs.
- Document the low-level generic client as the transport/manifests base and the fluent clients as the preferred public/test API.
- Document how to add a v2 endpoint once through the route tree and have routers, clients, manifests, and OpenAPI derive from it.
- Document approved tree-shaking removals and any retained low-level or compatibility surfaces.

## Non-Functional Requirements

- Preserve v1 API behavior and paths exactly.
- Do not rename internal Manager, MultiManager, or Host implementation packages/classes unless required for public contract cleanup.
- Keep the implementation incremental, type-testable, and reviewable.
- Avoid duplicate route/client structures; the route tree must remain the source of truth.
- Keep TypeScript strictness and CommonJS package build conventions.
- Preserve existing HTTP and verser2 transport behavior.
- Treat code removal as higher risk than additive typing work and gate removal behind explicit user approval.

## Acceptance Criteria

- `RestAPI2RouteTree` exists and defines the Root → Space → Hub → Instance hierarchy with supporting route groups.
- `RestAPI2RouteSets` and `RestAPI2Routes` are derived from the route tree.
- Public v2 paths and operation IDs use `/api/v2/spaces/:spaceId/...` and no longer expose `/api/v2/managers/:managerId/...`.
- Public v2 docs and generated OpenAPI no longer expose Manager/Host terminology as API concepts.
- Fluent clients exist for Root, Space, Hub, and Instance levels and can be instantiated directly at those levels.
- Fluent client methods infer typed request inputs and response bodies from route schemas.
- Current runtime routers are wired into route tree-derived route sets and remain typechecked.
- Adding a normal route to a route set causes typecheck failures in missing runtime bindings and missing fluent client coverage.
- RPC/custom dynamic route exceptions are explicit and documented.
- Old v2-related removal candidates are inventoried, user-approved before removal, and either removed or documented as retained.
- Focused package tests, typechecks, OpenAPI/schema-mode tests, and relevant v2 route tests pass.

## Out of Scope

- Changing v1 API paths, response shapes, status codes, headers, or client-visible behavior.
- Renaming internal implementation packages/classes such as `packages/manager`, `packages/multi-manager`, or `packages/host` solely for product terminology alignment.
- Adding public compatibility aliases for `/api/v2/managers/...` unless later explicitly requested.
- Replacing the existing low-level generic client or HTTP/verser2 transport stack.
- Fully typing arbitrary sequence-provided RPC route surfaces beyond allowing custom RestAPI2-compatible route trees.
- Removing old v2-related libraries, exports, or helpers without the required user interview and explicit approval.

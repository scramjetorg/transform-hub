# packages/rest-api2/src/

## Responsibility

Public v2 REST API contract source for Scramjet Transform Hub. This directory owns DTO schemas/types, the Root → Space → Hub → Instance route tree, derived route sets/router factories, and generic/fluent v2 clients.

## Design / Patterns

- **Namespace contracts**: `contracts.ts` exports the `RestAPI2` namespace with public DTOs, operation ids (`OperationId`), client request/response shapes, scope concepts, and stream/operation envelopes. Key types: `Root`, `Space`, `Hub`, `Sequence`, `Instance`, `Topic`, `HealthCheckInfo`, `OpResponse`, `ListResponse`, `ClientRequest`, `ClientResponse`, `ClientTransport`, `Client`, `RouteOwnership`, `ForwardingResolution`.
- **Zod schema mirror**: `schemas.ts` provides runtime validation schemas for all DTOs, route params/query/header/body/response contracts, health components, streams, storage, topics, events, and RPC payloads. Includes factory functions: `opResponse()`, `listResponse()`, `healthComponent()`, `healthCheckInfo()`. Also exports `RestAPI2Schemas` as a flat namespace for route definition composition.
- **Route tree as source of truth**: `routes.ts` defines `RestAPI2RouteTree` — a hierarchical tree with nodes `root`, `space`, `hub`, `sequence`, `instance`:
  - Each node has `concept`, `owner`, `routes()` (route set factory), optional `resolvers()` (resolver set factory), optional `groups` (sub-route groupings), optional `children` (child node references by resolver).
  - Route sets are returned by factory functions: `rootRouteSet()`, `spaceRouteSet()`, `hubRouteSet()`, `sequenceRouteSet()`, `instanceRouteSet()`.
  - Resolvers defined in `rootResolverSet()`, `spaceResolverSet()`, `hubResolverSet()`.
  - Router factories: `rootRouter()`, `spaceRouter()`, `hubRouter()`, `sequenceRouter()`, `instanceRouter()` — compose route sets + resolvers into mounted `RouterDefinition` instances.
  - `RestAPI2RouteSets` — typed route/resolver sets per tree node for binding.
  - `RestAPI2Routes` — pre-built router factory objects.
  - Helper: `getOpaqueRouteKeys()` — extracts route keys tagged as opaque (excluded from standard fluent clients).
  - Helper: `getRestAPI2Route()` — finds a route definition by method+path.
- **Fluent client builder**: `client.ts` builds:
  - `createRestAPI2Client()` — generic low-level client from manifest + transport.
  - `createRootClient()`, `createSpaceClient()`, `createHubClient()`, `createInstanceClient()` — typed fluent clients for each tree level.
  - `createFluentClientFromRouteTreeNode()` — generic fluent client from any tree node.
  - Fluent types: `RootClient`, `SpaceClient`, `HubClient`, `InstanceClient` with nested scope methods (`.space(id)`, `.hub(id)`, `.instance(id)`).
  - Re-exports `createHttpClientTransport`, `createVerser2ClientTransport`, `ApiClientTransport`.

## Data & Control Flow

1. `schemas.ts` defines Zod schemas and inferred DTO shapes referenced by route definitions.
2. `routes.ts` composes handlerless route sets into public v2 routers and resolver-expanded manifests.
3. Runtime packages bind implementation handlers against `RestAPI2RouteSets` from the same route tree.
4. `client.ts` collects route manifests from `RestAPI2Routes`, creates a generic `RestAPI2.Client`, and exposes typed fluent endpoint methods.
5. Custom route tree nodes can construct scoped fluent clients through `createFluentClientFromRouteTreeNode()`.

## Integration Points

- Depends on `@scramjet/api-router` for route definitions, manifests, router factories, client transports, and schema-mode/OpenAPI integration.
- Consumed by Host (`host-api-v2.ts`), Manager (`manager-api-v2.ts`), and MultiManager (`multi-manager-api-v2.ts`) for v2 handler binding and route manifests.
- Publicly exported through `src/index.ts` as the v2 contract/client package surface.

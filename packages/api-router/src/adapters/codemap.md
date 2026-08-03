# packages/api-router/src/adapters/

## Responsibility

Translates `@scramjet/api-router` route manifests and `RouterDefinition` instances into runtime-executable HTTP handlers and verser2 route registrations. This is the bridge between schema-first route contracts and actual request execution surfaces.

## Modules

### `http.ts` — HTTP adapter (200 lines)

Core adapter that registers collected routes onto a `@scramjet/types` `APIRoute`/`APIExpose` surface (Cero-backed).

- **`registerHttpRoutes(api, router)`**: Iterates collected routes and resolvers, registering each on the API surface:
  - **Resolvers**: Registered as middleware via `api.use()`. `createResolverMiddleware()` matches `:param`-style URL patterns, extracts params, runs the resolver handler, then dispatches to the resolved target (local router lookup or verser2 redirect).
  - **Request routes** (kind = `"request"`, default): `GET` → `api.get()`, `POST/PUT/PATCH/DELETE` → `api.op()`.
  - **Stream routes**: `upstream` → `api.upstream()`, `downstream` → `api.downstream()`, `duplex` → `api.duplex()`.
- **`executeRouteDefinition(route, requestLike, responseLike?)`**: Validates request against Zod schemas, runs the route hook pipeline, executes the handler, validates the response.
- **Resolver dispatch**: Supports `local` (Cero router lookup), `redirect` (verser2 route domain redirect), or 404/501 fallbacks.

### `verser2.ts` — Verser2 adapter (45 lines)

Lighter-weight adapter for verser2 broker-based route registration.

- **`registerVerser2Routes(adapter, router)`**: Registers each collected route as a `Verser2RouteRegistration` on a `Verser2RouteAdapter`.
- Each registration wraps `executeRouteDefinition()` to handle incoming verser2 requests and return response status/body.

## Integration Points

- Consumed by `HostAPIV2Handler`, `ManagerAPIV2Handler`, and `MultiManagerAPIV2Handler` to wire v2 route handlers onto their API surfaces.
- `http.ts` depends on `@scramjet/types` (`APIRoute`, `ParsedMessage`) and the `executeRoutePipeline` hook infrastructure.
- `verser2.ts` reuses `executeRouteDefinition` from `http.ts`.

# packages/host/src/

## Responsibility

Source entrypoint layer for the Host package. It exposes the host runtime library and organizes API handlers, lifecycle controllers, stores, service-discovery modules, stable runner host identity derivation, audit middleware, and platform connectivity implementation under `lib/`.

## Design/Patterns

- Thin source barrel plus cohesive runtime modules under `lib/`.
- Lifecycle orchestration is centralized in the `Host` class.
- API handler modules attach v1 and v2 REST behavior to the host-owned API server.
- Runtime adapter interaction is isolated behind lifecycle and dispatcher abstractions.
- Verser2 runner host identity is resolved in `lib/host-id.ts` and consumed by `runner-verser2-host-config.ts` during host startup.

## Data & Control Flow

1. Consumers import the host package and call into exported host startup/runtime components.
2. Runtime construction flows into `lib/host.ts`, which creates stores, logger, socket server, API exposure (v1+v2 via `host-api.ts`), adapters, optional Manager connector, and runner Verser2 host config.
3. API and socket traffic flows from handlers into instance/sequence controllers and back to response streams, logs, audit streams, and service discovery.
4. V2 API routes are registered via `registerHttpRoutes()` from `@scramjet/api-router`, while v1 uses direct handler registration on the `APIExpose` surface.

## Integration Points

- Main implementation map: [lib](lib/codemap.md).
- API handler map: [lib/api](lib/api/codemap.md); middleware map: [lib/middlewares](lib/middlewares/codemap.md); service discovery map: [lib/serviceDiscovery](lib/serviceDiscovery/codemap.md).
- Consumed by `packages/sth/src/bin/hub.ts` during STH startup.
- Shares config and transport contracts from `@scramjet/types`.
- V2 API depends on `@scramjet/api-router` and `@scramjet/rest-api2`.

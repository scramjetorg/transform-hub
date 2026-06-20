# packages/multi-manager/src/lib/api/

## Responsibility

Multi-Manager API handler modules that register v1 and v2 REST routes on the Multi-Manager's `APIExpose` surface. These expose cluster-wide endpoints for Manager lifecycle, aggregated state, verser2 trust export, health, and log/audit streams.

## Modules

### `multi-manager-api.ts` — `MultiManagerAPIHandler` (28 lines)

Composite handler that instantiates and attaches both v1 and v2 handlers:
- Wraps all requests with a trace-logging middleware.
- `MultiManagerAPIV1Handler` for legacy v1 REST endpoints.
- `MultiManagerAPIV2Handler` for v2 REST endpoints.

Re-exports both handler classes.

### `multi-manager-api-v1.ts` — `MultiManagerAPIV1Handler` (115 lines)

Legacy v1 REST API. Key routes:
- `GET /api/v1/version`, `/info`, `/load-check`, `/list`, `/health`, `/verser2/trust/:id?` — using `@scramjet/api-router` registered via `registerHttpRoutes()`.
- `POST /api/v1/start` — Spawns a new Manager instance (load-check gated).
- `POST /api/v1/cpm/:id/stop` — Stops a managed Manager.
- `GET /api/v1/log` — SSE upstream from `CommonLogsPipe`.
- `GET /api/v1/audit` — SSE upstream from `MultiManagerAuditor`.
- `GET/POST /api/v1/cpm/:id/*` — Proxies to managed Manager's router via `cpmMiddleware()`.

### `multi-manager-api-v2.ts` — `MultiManagerAPIV2Handler` (104 lines)

V2 REST API using `@scramjet/api-router` contracts and `@scramjet/rest-api2` route sets.

- **`createV2Router()`**: Binds `RestAPI2RouteSets.root.routes()` to MultiManager methods:
  - `version` — service name, `apiVersion: "v2"`, version, build hash.
  - `info` — apiBase, apiPort, id, spacesCount (from `ManagersStore`).
  - `load` — from `LoadCheck.getLoadCheck()`.
  - `spaces` — iterates `managersStore.list()`, maps to `RestAPI2.Space`.
  - `health` — `getV2HealthCheckInfo()` which aggregates default health components.
  - `trust` — verser2 trust export (optionally scoped to a specific Manager by ID param).
  - `audit` — delegates to `MultiManager.commonAuditPipe()`.
- **Space resolver**: Binds `RestAPI2RouteSets.root.resolvers().space` to a redirect resolver that looks up the Manager in `ManagersStore` and returns the verser2 route domain redirect target for Space-owned v2 routes.
- **`attach()`**: Calls `registerHttpRoutes()` with the v2 router.

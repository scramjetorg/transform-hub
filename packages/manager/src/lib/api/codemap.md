# packages/manager/src/lib/api/

## Responsibility

Manager API handler modules that register v1 and v2 REST routes on the Manager's Cero-based router surface. These translate between route contracts and the Manager's internal stores, controllers, and transport abstractions.

## Modules

### `manager-api.ts` — `ManagerAPIHandler` (25 lines)

Composite handler that instantiates and attaches both v1 and v2 handlers:
- `ManagerAPIV1Handler` for legacy v1 REST endpoints.
- `ManagerAPIV2Handler` for v2 REST endpoints.

Re-exports both handler classes.

### `manager-api-v1.ts` — `ManagerAPIV1Handler` (220 lines)

Legacy v1 REST API. Key responsibilities:
- **STH registration**: `POST /api/v1/sth` accepts registration payloads and calls `manager.handleSthRegistration()`.
- **Aggregated queries**: `GET /list`, `/instances`, `/sequences`, `/all_sequences`, `/entities`, `/topics`.
- **STH proxy**: `GET/POST /api/v1/sth/:id/*` → `manager.handleRequestToSTH()` for verser-routed forwarding.
- **STH info/delete**: `GET /api/v1/sth/:id/info`, `DELETE /api/v1/sth/:id`.
- **Topic streams**: `GET/POST /api/v1/topic/:name` for upstream/downstream topic streams.
- **Log/audit/load streams**: Upstream handlers for `/log`, `/load-stream`.
- **Store management**: `DELETE /api/v1/store` to clear sequence storage index.
- **Disconnect**: `POST /api/v1/disconnect` with ID/accessKey/limit criteria.
- **S3 proxy**: Mounts storage router at `/api/v1/s3/` when S3 config is present.
- **V1 compatibility router**: `createV1CompatibilityRouter()` uses `@scramjet/api-router` contracts for `/version`, `/config`, `/verser2/trust`, `/load`.

### `manager-api-v2.ts` — `ManagerAPIV2Handler` (315 lines)

V2 REST API using `@scramjet/api-router` contracts and `@scramjet/rest-api2` route sets.

- **`createV2Router()`**: Binds `RestAPI2RouteSets.space.routes()` to Manager methods:
  - `version`, `config`, `trust` (verser2 trust export), `load`, `health`.
  - `list`, `hubs`, `instances`, `sequences`, `all_sequences`, `entities`, `topics`.
  - `topicInfo`, `topicRead`, `topicWrite` — topic stream handlers via manager's service discovery.
  - `logs`, `audit` — aggregated log/audit streams.
  - `deleteHub` — hub disconnection/deletion via inventory management.
  - `storageSequences` — lists stored sequences; `storageClear` — clears store index.
  - `storageObjectRead/Write/Delete` → `routeBinding.skip()` (require storage service extraction).
- **Hub resolver**: Binds `RestAPI2RouteSets.space.resolvers().hub` to a redirect resolver that looks up the STH in `SthConnectionStore` and returns a verser2 route domain redirect target.
- **`attach()`**: Calls `registerHttpRoutes()` with the v2 router + attaches storage compatibility proxy middleware that translates v2 storage paths to legacy v1 S3 paths.
- All responses use `RestAPI2.OpResponse` and `RestAPI2.ListResponse` envelope types.

# packages/manager/src/lib/api/

## Responsibility

Manager API handler modules that register v1 and v2 REST routes on the Manager's Cero-based router surface. These translate between route contracts and the Manager's internal stores, controllers, and transport abstractions.

## Modules

### `manager-api.ts` — `ManagerAPIHandler` (25 lines)

Composite handler that instantiates and attaches both v1 and v2 handlers:
- `ManagerAPIV1Handler` for legacy v1 REST endpoints.
- `ManagerAPIV2Handler` for v2 REST endpoints (via `@scramjet/rest-api2` route sets).

Re-exports both handler classes.

### `manager-api-v1.ts` — `ManagerAPIV1Handler` (219 lines)

Legacy v1 REST API. Key responsibilities:
- **STH registration**: `POST /api/v1/sth` accepts registration payloads (with description/tags/accessKey) and calls `manager.handleSthRegistration()`.
- **Aggregated queries**: `GET /list`, `/instances`, `/sequences`, `/all_sequences`, `/entities`, `/topics` with pagination support.
- **STH proxy**: `GET/POST /api/v1/sth/:id/*` → `manager.handleRequestToSTH()` for verser2-routed forwarding with route classification.
- **STH info/delete**: `GET /api/v1/sth/:id/info`, `DELETE /api/v1/sth/:id` (with `x-force` header support).
- **Topic streams**: `GET/POST /api/v1/topic/:name` for upstream/downstream topic streams.
- **Log/audit/load streams**: Upstream handlers for `/log`, `/load-stream`.
- **Store management**: `DELETE /api/v1/store` to clear sequence storage index.
- **Disconnect**: `POST /api/v1/disconnect` with ID/accessKey/limit criteria.
- **S3 proxy**: Mounts storage router at `/api/v1/s3/` when S3 config is present.
- **V1 compatibility router**: `createV1CompatibilityRouter()` uses `@scramjet/api-router` contracts for `/version`, `/config`, `/verser2/trust`, `/load` with Zod response schemas.

### `manager-api-v2.ts` — `ManagerAPIV2Handler` (375 lines)

V2 REST API using `@scramjet/api-router` contracts and `@scramjet/rest-api2` space route sets.

- **`createV2Router()`**: Binds `RestAPI2RouteSets.space.routes()` to Manager methods:
  - `version`, `config`, `trust` (verser2 trust export), `load`, `health` (with aggregation readiness via `getV2HealthCheckInfo()`).
  - `list`, `hubs`, `instances`, `sequences`, `all_sequences`, `entities`, `topics` — with pagination via `getPaginated()`.
  - `topicInfo`, `topicRead`, `topicWrite` — topic stream handlers via manager's service discovery (raw HTTP passthrough).
  - `logs`, `audit` — aggregated log/audit streams with flowing state management.
  - `deleteHub` — hub disconnection/deletion via inventory management (supports force, disconnect, reason query params).
  - `storageSequences`, `storageClear` — store listing and index clearing.
  - `storageObjectRead/Write/Delete` → `routeBinding.skip()` (require storage service extraction).
  - Instance/sequence mapping helpers: `mapManagerInstances()`, `mapManagerSequences()` with `apiBase` generation.
- **Hub resolver**: Binds `RestAPI2RouteSets.space.resolvers().hub` to a redirect resolver that looks up the STH in `SthConnectionStore` and returns a verser2 route domain redirect target with `toImplementerPath()`.
- **`attach()`**: Calls `registerHttpRoutes()` with the v2 router + attaches storage compatibility proxy middleware (`attachStorageCompatibilityProxy()`) that translates v2 storage paths (`/api/v2/storage/objects/...`) to legacy v1 S3 paths (`/api/v1/s3/...`).
- All responses use `RestAPI2.OpResponse` and `RestAPI2.ListResponse` envelope types.

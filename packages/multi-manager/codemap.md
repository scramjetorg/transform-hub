# packages/multi-manager/

## Responsibility

Multi-Manager is the Scramjet Cloud Platform control plane that orchestrates multiple `@scramjet/manager` instances. It exposes a REST API (v1 and v2) for lifecycle management (start/stop/list) of sub-Managers, aggregates audit logs and common log streams, and hosts verser2 routing for STH-to-Manager connectivity. It also provides load-check gating, health monitoring, optional S3 persistence configuration, and auto-generated verser2 TLS identity for each managed Manager.

## Design/Patterns

- **Sub-Manager lifecycle**: Runs child `Manager` processes as in-process instances managed via `ManagersStore` (extends generic `Store<Manager>`). Supports start requested via API (`POST /api/v1/start`) or through CLI/config pre-population (`startManagers()`).
- **Verser2 integration**: Starts a verser2 Host and attaches local Broker/Guest peers for each managed Manager instance. Supports auto-generated TLS identity via `resolveManagerVerser2HostConfig()` and `createVerser2HostOptions()` with certificate authorization patterns.
- **Config merge pipeline**: CLI options parsed by `@scramjet/config`, merged with JSON file config and compile-time defaults in `MultiManagerConfig`.
- **Auditor aggregation**: `MultiManagerAuditor` multiplexes audit streams from all sub-Managers into a single `ReReadable` output via `MultiStream`.
- **V1 + V2 API**: `MultiManagerAPIHandler` composes `MultiManagerAPIV1Handler` (legacy with `/version`, `/info`, `/list`, `/health`, `/verser2/trust/:id?`, `/start`, `/cpm/:id/stop`, `/log`, `/audit`) and `MultiManagerAPIV2Handler` (v2 via `@scramjet/api-router` contracts from `RestAPI2RouteSets.root`). V2 uses verser2 redirect resolver for Space-owned routes.
- **Health & monitoring**: `HealthCheck` attached to the API HTTP server; optional `MonitoringServer` on a separate port. V2 health check includes Space scope with sub-Manager count and OS load components.

## Data & Control Flow

1. `src/bin/start.ts` parses CLI flags, constructs `MultiManagerConfig`, creates an `APIExpose` HTTP server, and instantiates `MultiManager`.
2. `MultiManager.start()` resolves verser2 host config (auto-generates TLS identity if needed), sets up API routing (v1+v2), starts the verser2 Host, optionally starts `MonitoringServer`, begins listening, and optionally starts pre-configured Manager instances.
3. Each managed Manager gets local verser2 Broker/Guest peers attached via `attachManagerVerser2Peers()` — a local broker for STH routing requests and a local guest that routes incoming verser2 requests to the Manager's Cero router.
4. REST API calls to `/api/v1/start` spawn new Manager instances (load-check gated, verser2 peer attached, auditor registered); `/api/v1/cpm/:id/*` proxies to the named Manager's router.
5. V2 API: `GET /api/v2/...` routes registered via `registerHttpRoutes()`. `/spaces/:spaceId` routes are resolved through verser2 redirect to the target Manager's `routeDomain`.
6. Logs/audit from all sub-Managers pipe into `CommonLogsPipe`/`MultiManagerAuditor`, exposed as SSE upstreams.

## Directory Map

| Directory | Responsibility |
|-----------|---------------|
| `src/bin/` | CLI entrypoint (`start.ts`) |
| `src/config/` | Configuration classes (`MultiManagerConfig`, `MultiManagerServerConfig`) |
| `src/lib/` | Core orchestration logic (`MultiManager`, manager store, auditor, ports parser, verser2 host/trust helpers, default config, API handlers) |
| `src/lib/api/` | V1 and V2 REST API handlers (`MultiManagerAPIHandler`, `MultiManagerAPIV1Handler`, `MultiManagerAPIV2Handler`) |
| `src/types/` | Shared type definitions for options, commands, and API request params |
| `src/index.ts` | Barrel export (public: `portsParser`) |

## Integration Points

- **`@scramjet/api-server`**: HTTP server (`APIExpose`) and route registration.
- **`@scramjet/api-router`**: Route contracts, binding, HTTP adapter for v2 API.
- **`@scramjet/rest-api2`**: V2 route sets and schemas for Root-owned routes (version, info, load, spaces, health, trust, audit).
- **`@scramjet/config`**: CLI option parsing and verser2 config masking.
- **`@scramjet/manager`**: Sub-Manager lifecycle, audit streams, health endpoints, verser2 STH routing helpers (`createManagerSthLocalBrokerTransport`, `CommonLogsPipe`, `HealthCheck`).
- **`@signicode/verser2-host` / `@signicode/verser-common`**: Verser2 Host and route/trust support (local broker/guest attachments).
- **`@scramjet/load-check`**: Resource pressure gating.
- **`@scramjet/monitoring-server`**: Health-check endpoint on separate port.
- **`@scramjet/obj-logger`**: Structured logging.
- **`@scramjet/utility`**: `ReadOnlyConfig`, `FreePortsFinder`, `promiseTimeout`, `merge`, `readJsonFile`.
- **`@scramjet/types`**: Type contracts (`MMRestAPI`, `LoadCheckRequirements`, `ManagerConfiguration`, `ManagerVerser2Config`).
- **`scramjet`**: DataStream / StringStream / MultiStream for log and audit stream processing.
- **`selfsigned`**: Auto-generated TLS certificates for verser2 Host identity.

# packages/multi-manager/src/lib/

## Responsibility

Core orchestration library for the Multi-Manager. Contains the main `MultiManager` class (345 lines), verser2 Host attachment with auto-generated TLS identity for managed Managers, Manager lifecycle stores, audit log aggregation, port-range parsing, default configuration, and v1/v2 API handlers.

## Design/Patterns

- **`MultiManager`** (345 lines): Central orchestrator. Owns the HTTP API server (`APIExpose`), verser2 Host, sub-Manager registry (`ManagersStore`), load check, health check, audit aggregator, and common log pipe. Sets up v1+v2 REST routing on start and attaches local Broker/Guest peers for each managed Manager. Supports pre-configured Manager startup via `startManagers()` and API-driven Manager start via `handleStartManagerRequest()`.
- **`ManagersStore`**: Typed `Store<Manager>` for active sub-Manager instances.
- **`Store<T>`**: Generic Map-backed registry with `add`, `remove`, `list`, `getById`, and `size`.
- **`MultiManagerAuditor`** (54 lines): Multiplexes audit streams from all attached `ManagerAuditor` instances into a `ReReadable` output via `MultiStream`. Handles `onAuditRequest` lifecycle (flowing state per connected request).
- **`portsParser`** (35 lines): Validates `N-N` port-range CLI arguments.
- **`defaultConfig.ts`** (145 lines): Module-level defaults including full `ManagerVerser2Config`. `createSettings()` maps CLI options to `MultiManagerOptions` with S3 env var support.
- **`verser2-host-config.ts`** (65 lines): `createVerser2HostOptions()` — builds verser2 Host options from MultiManager config. Includes certificate-based authorization with mTLS and fingerprint checking.
- **`verser2-host-identity.ts`** (176 lines): `resolveManagerVerser2HostConfig()` — auto-generates self-signed CA/server certificates via `selfsigned` if no TLS files configured. Manages identity directory, permission checks, and SAN generation.
- **`verser2-trust-export.ts`** (53 lines): `getMultiManagerVerser2TrustExport()` — reads CA certificate, returns trust export with optional manager-specific guest route domain.

## Data & Control Flow

1. `MultiManager.start()` → resolve verser2 host config (auto-generate TLS if needed), `setRouting()` (attaches v1+v2 API handlers), start verser2 Host, optional `startMonitoringServer()`, `server.listen()`, optional `startManagers()`.
2. Manager startup (`startManagers()` or `handleStartManagerRequest()`) creates `new Manager()`, attaches local verser2 Broker/Guest peers (`attachManagerVerser2Peers()`), registers health endpoint, attaches auditor, adds to store.
3. Verser2 peer attachment: local broker handles STH routing requests; local guest routes incoming verser2 domain requests to Manager's Cero router.
4. API `POST /v1/start` → load-check gates → spawns Manager → attaches verser2 peers → registers in store.
5. API `GET /v2/spaces` → lists Managers; `GET /v2/spaces/:spaceId/*` → verser2 redirect to target Manager's `routeDomain`.
6. API `GET /v1/log|audit` → SSE upstream from `CommonLogsPipe`/`MultiManagerAuditor`.
7. API `GET /v2/audit` → Root-owned audit route.

## Directory Map

| Module | Responsibility |
|--------|---------------|
| `multi-manager.ts` | Central `MultiManager` orchestrator class (345 lines) |
| `manager-store.ts` | `ManagersStore` — `Store<Manager>` |
| `store.ts` | Generic `Store<T>` Map-backed registry |
| `mulit-manager-auditor.ts` | `MultiManagerAuditor` — audit stream multiplexer |
| `ports-parser.ts` | Port-range CLI validation |
| `default-config.ts` | Module-level defaults with verser2 config |
| `verser2-host-config.ts` | Verser2 Host options factory (TLS identity, auth) |
| `verser2-host-identity.ts` | Auto-generate TLS certs for verser2 Host |
| `verser2-trust-export.ts` | Verser2 CA trust export |
| `api/` | V1 and V2 API handlers |

## Integration Points

- `@scramjet/manager`: `Manager`, `CommonLogsPipe`, `HealthCheck`, `ManagerAuditor`, `createManagerSthLocalBrokerTransport`.
- `@scramjet/api-router`: Route contracts, binding, HTTP adapter for v2 API.
- `@scramjet/rest-api2`: V2 route sets and schemas (Root-owned routes).
- `@signicode/verser2-host`: Verser2 Host and local Broker/Guest attachments.
- `@scramjet/api-server`: `APIExpose`.
- `@scramjet/load-check`: `LoadCheck`, `LoadCheckConfig`.
- `@scramjet/model`: `IDProvider`.
- `@scramjet/utility`: `FreePortsFinder`, `promiseTimeout`, `merge`, `readJsonFile`.
- `@scramjet/monitoring-server`: `MonitoringServer`.
- `@scramjet/obj-logger`: `ObjLogger`, `prettyPrint`.
- `@scramjet/types`: `MMRestAPI`, `MonitoringServerConfig`, `ManagerConfiguration`, `ManagerVerser2Config`.
- `scramjet`: `DataStream`, `StringStream`, `MultiStream`.
- `rereadable-stream`: `ReReadable`.
- `selfsigned`: Auto-generated TLS certificates.

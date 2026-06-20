# packages/multi-manager/src/lib/

## Responsibility

Core orchestration library for the Multi-Manager. Contains the main `MultiManager` class, verser2 Host attachment for managed Managers, Manager lifecycle stores, audit log aggregation, port-range parsing, default configuration, and v1/v2 API handlers.

## Design/Patterns

- **`MultiManager`**: Central orchestrator. Owns the HTTP API server (`APIExpose`), verser2 Host, sub-Manager registry (`ManagersStore`), load check, health check, audit aggregator, and common log pipe. Sets up v1+v2 REST routing on start and attaches local Broker/Guest peers for each managed Manager.
- **`ManagersStore`**: Typed `Store<Manager>` for active sub-Manager instances.
- **`Store<T>`**: Generic Map-backed registry with `add`, `remove`, `list`, `getById`, and `size`.
- **`MultiManagerAuditor`**: Multiplexes audit streams from all attached `ManagerAuditor` instances into a `ReReadable` output.
- **`portsParser`**: Validates `N-N` port-range CLI arguments.
- **`defaultConfig`**: Module-level defaults and `createSettings()` helper for CLI→options mapping.
- **`verser2-host-config.ts`**: `createVerser2HostOptions()` — builds verser2 Host options from MultiManager config.
- **`verser2-host-identity.ts`**: `resolveManagerVerser2HostConfig()` — resolves TLS certs, host URL, and route domains.
- **`verser2-trust-export.ts`**: `getMultiManagerVerser2TrustExport()` — reads CA certificate, returns trust export.

## Data & Control Flow

1. `MultiManager.start()` → resolve/start verser2 Host, `setRouting()` (attaches v1+v2 API handlers), optional `startMonitoringServer()`, `server.listen()`, optional `startManagers()`.
2. Manager startup attaches local verser2 Broker/Guest peers so STH registrations and forwarding route through the selected Manager.
3. API `POST /v1/start` → load-check gates → `new Manager(...)`, `.main()`, attaches auditor, adds to store.
4. API `GET /v2/spaces` → lists Managers; `GET /v2/spaces/:spaceId/*` → verser2 redirect to target Manager's `routeDomain`.
5. API `GET /v1/log|audit` → SSE upstream from `CommonLogsPipe`/`MultiManagerAuditor`.

## Directory Map

| Module | Responsibility |
|--------|---------------|
| `multi-manager.ts` | Central `MultiManager` orchestrator class |
| `manager-store.ts` | `ManagersStore` — `Store<Manager>` |
| `store.ts` | Generic `Store<T>` Map-backed registry |
| `mulit-manager-auditor.ts` | `MultiManagerAuditor` — audit stream multiplexer |
| `ports-parser.ts` | Port-range CLI validation |
| `default-config.ts` | Module-level defaults |
| `verser2-host-config.ts` | Verser2 Host options factory |
| `verser2-host-identity.ts` | TLS cert/host config resolver |
| `verser2-trust-export.ts` | Verser2 CA trust export |
| `api/` | V1 and V2 API handlers |

## Integration Points

- `@scramjet/manager`: `Manager`, `CommonLogsPipe`, `HealthCheck`, `ManagerAuditor`.
- `@scramjet/api-router`: Route contracts, binding, HTTP adapter for v2 API.
- `@scramjet/rest-api2`: V2 route sets and schemas.
- `@scramjet/manager-config`: `getDefaultConfig()`.
- `@signicode/verser2-host`: Verser2 Host and local Broker/Guest attachments.
- `@scramjet/api-server`: `APIExpose`.
- `@scramjet/load-check`: `LoadCheck`, `LoadCheckConfig`.
- `@scramjet/model`: `IDProvider`.
- `@scramjet/utility`: `FreePortsFinder`, `promiseTimeout`, `merge`, `readJsonFile`.
- `@scramjet/monitoring-server`: `MonitoringServer`.
- `@scramjet/obj-logger`: `ObjLogger`, `prettyPrint`.
- `@scramjet/types`: `MMRestAPI`, `MonitoringServerConfig`, `ManagerConfiguration`.
- `scramjet`: `DataStream`, `StringStream`, `MultiStream`.
- `rereadable-stream`: `ReReadable`.

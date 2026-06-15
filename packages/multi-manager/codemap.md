# packages/multi-manager/

## Responsibility

Multi-Manager is the Scramjet Cloud Platform control plane that orchestrates multiple `@scramjet/manager` instances. It exposes a REST API for lifecycle management (start/stop/list) of sub-Managers, aggregates audit logs and common log streams, and hosts verser2 routing for STH-to-Manager connectivity. It also provides load-check gating, health monitoring, and optional S3 persistence configuration for sub-Managers.

## Design/Patterns

- **Sub-Manager lifecycle**: Runs child `Manager` processes as in-process instances (`new Manager(...)`) managed via `ManagersStore`. Supports start requested via API or through CLI/config pre-population.
- **verser2 transport**: Starts a verser2 Host and attaches local Broker/Guest peers for each managed Manager instance.
- **Config merge pipeline**: CLI options parsed by `@scramjet/config`, merged with JSON file config and compile-time defaults in `MultiManagerConfig` (extends `ReadOnlyConfig`).
- **Auditor aggregation**: `MultiManagerAuditor` multiplexes audit streams from all sub-Managers into a single `ReReadable` output, streamed to API consumers on demand.
- **Generic `Store<T>`**: Typed Map-based registry (extended by `ManagersStore`) for safe collection management.
- **Health & monitoring**: `HealthCheck` attached to the API HTTP server; optional `MonitoringServer` on a separate port for external health probes.

## Data & Control Flow

1. `src/bin/start.ts` parses CLI flags via `parseCliOptions`, constructs `MultiManagerConfig` (merging defaults, file config, and CLI), creates an `APIExpose` HTTP server, and instantiates `MultiManager`.
2. `MultiManager.start()` sets up API routing, starts the verser2 Host, optionally starts `MonitoringServer`, begins listening on the configured host:port, and optionally starts pre-configured Manager instances.
3. Each managed Manager gets local verser2 Broker/Guest peers attached to the MultiManager Host for STH routing.
4. REST API calls to `/api/v1/start` spawn new Manager instances (load-check gated); `/api/v1/cpm/:id/*` proxies to the named Manager's router.
5. Logs from all sub-Managers pipe into `CommonLogsPipe`, exposed as a Server-Sent Events upstream at `/api/v1/log`. Audit events aggregate through `MultiManagerAuditor` at `/api/v1/audit`.

## Directory Map

| Directory | Responsibility |
|-----------|---------------|
| `src/bin/` | CLI entrypoint (`start.ts`) |
| `src/config/` | Configuration classes (`MultiManagerConfig`, `MultiManagerServerConfig`) |
| `src/lib/` | Core orchestration logic (`MultiManager`, manager store, auditor, ports parser, verser2 host/trust helpers) |
| `src/types/` | Shared type definitions for options, commands, and API request params |
| `src/index.ts` | Barrel export (re-exports `portsParser` from `lib/ports-parser`) |

## Integration Points

- **`@scramjet/api-server`**: Creates the HTTP server (`APIExpose`) and registers routes.
- **`@scramjet/config`**: CLI option parsing (`parseCliOptions`).
- **`@scramjet/manager`**: Sub-Manager lifecycle, audit streams, health endpoints, and verser2 STH routing helpers.
- **`@scramjet/manager-config`**: Default Manager configuration factory.
- **`@signicode/verser2-host` / `@signicode/verser-common`**: verser2 Host and route/trust support for Manager/STH connectivity.
- **`@scramjet/load-check`**: Resource pressure gating before spawning new Managers.
- **`@scramjet/monitoring-server`**: Health-check endpoint on a separate port.
- **`@scramjet/obj-logger`**: Structured logging with pipe/stream support.
- **`@scramjet/utility`**: `ReadOnlyConfig`, `FreePortsFinder`, `promiseTimeout`, `merge`, `readJsonFile`.
- **`@scramjet/types`**: Type contracts (`MMRestAPI`, `LoadCheckRequirements`, `ManagerConfiguration`, etc.).
- **`scramjet`**: DataStream / StringStream / MultiStream for log and audit stream processing.

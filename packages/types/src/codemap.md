# packages/types/src/

## Responsibility

Defines the canonical configuration, adapter, messaging, runtime-executor, REST API, manager-side, and API-client types shared across all STH packages.

## Design / Patterns

Patternized around centralized contract types: protocol-facing message unions/tuples in `messages/*` + `message-streams`, runtime process contract types in `runtime-executor`, structural config DTOs supporting layered merges from env/CLI/stored config, namespaced REST API surfaces for STH/Manager/Multi-Manager/Middleware, and manager-side connection lifecycle types in `manager/`.

### Subdirectory structure

| Directory | Purpose |
|---|---|
| `api-client/` | API client factory type (`factory.ts`), ambient host/manager client declarations |
| `client-utils/` | HTTP client utility types (`HttpClient`, `ClientUtils`, `SendStreamOptions`) |
| `dto/` | Endpoint payload DTOs (`start-sequence`, `set-instance`) |
| `error-codes/` | Error type hierarchy (`AppError`, `HostError`, `RunnerError`, etc.) |
| `manager/` | STH connection lifecycle, service discovery, topic actor, info register |
| `messages/` | Protocol-facing message unions/tuples (handshake, monitoring, control, events) |
| `rest-api-commons/` | Shared REST API response types (version, load-check) |
| `rest-api-error/` | Standardized API error response shape (`APIErrorMessage`) |
| `rest-api-manager/` | Manager REST API request/response types (20 files) |
| `rest-api-middleware/` | Middleware REST API types (multi-manager discovery, version) |
| `rest-api-multi-manager/` | Multi-manager REST API types (10 files) |
| `rest-api-sth/` | STH host REST API types (22 files) |

### Root-level type files (20+)

Key types include: `AppConfig`, `AppContext` (sequence-facing context with v1/v2 hub/space clients), `APIExpose` (HTTP API routing), `Application`/`TranformApp`/`ReadableApp`/`WritableApp`/`InertApp` (sequence signatures), `STHCommandOptions` (86 CLI flags), `STHConfiguration` (canonical host config), `Instance` (full record type), `RuntimeExecutor`, `Verser2TlsFilesConfig`/`STHRunnerVerser2HostConfig`, `TelemetryConfig`, `ILocalStorage`, `ManagerConfiguration`.

## Data & Control Flow

CLI options flow into `STHCommandOptions`, merge into `STHConfiguration`, then into runtime-related DTOs that adapters and runners consume. Message layer types (`MessageType`, `MessageDataType`, typed message tuples) map `RunnerMessageCode`/`CPMMessageCode` to concrete payload schemas, while `CommunicationChannel`/stream state enums imported from symbols shape runtime transport wiring and stream lifecycle states.

`runtime-executor.ts` re-exports `RuntimeKind` and `selectRuntimeKind`, wiring `BootConfig` and executor/spawn interfaces directly to the same runtime selection contract used by outer runner and adapters.

API client types (`api-client/factory.ts` `ApiClientFactory<TClient, TUtils>`) enable DI-based client creation patterns, while ambient declarations in `host-client.ts` and `manager-client.ts` define the full `HostClient`/`ManagerClient`/`InstanceClient`/`SequenceClient` operation surfaces.

## Integration Points

Imported by `sth-config`, `sth`, `runner`, `host`, `manager`, `multi-manager`, API/client packages, adapters, and runtime wrappers. Runtime-kind exports are consumed by executor selection logic (`packages/runner/src/executor/select.ts`) and runtime decision helpers (`packages/adapters-common`). Manager types consumed by `@scramjet/manager` and `@scramjet/multi-manager`.

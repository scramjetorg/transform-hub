# packages/types/

## Responsibility

**Deprecated** compatibility package for Scramjet Transform Hub. Previously the canonical shared type package; now re-exports from `@scramjet/runtime-types`, `@scramjet/sequence-types`, and `@scramjet/api-types`. Existing imports continue to resolve. New code should import from the split packages directly.

Legacy surface includes: CLI options, merged STH configuration, runtime executor contracts, adapter-facing DTOs, message protocol types, REST API contracts (STH, Manager, Multi-Manager, Middleware), manager-side connection lifecycle types, verser2 networking config, v1/v2 API client factories, and sequence/application interface types.

## Design / Patterns

- **Pure type surface** with structural config models, partial-update friendly shapes, and explicit protocol contracts imported from `@scramjet/symbols`.
- **Namespaced REST API barrels**: four dedicated REST API namespaces — `STHRestAPI` (STH host), `MRestAPI` (Manager), `MMRestAPI` (Multi-Manager), `MWRestAPI` (Middleware) — each with request/response shapes for their respective endpoints.
- **Manager-side type contracts** (`manager/`): STH connection lifecycle (`ISTHController`, `ISTHConnectionStore`), service discovery (`IServiceDiscovery`, `ITopicActor`), and host/sequence/instance info tracking (`ISTHInfoRegister`).
- **API client factory types** (`api-client/`): generic `ApiClientFactory<TClient, TUtils>` type for DI-based client creation, plus ambient declarations for `HostClient`, `ManagerClient`, `InstanceClient`, `SequenceClient`.
- **Runtime executor contract** (`runtime-executor.ts`): `BootConfig`, `SpawnOptions`, `RuntimeProcessHandles`, `RuntimeExecutor`, plus runtime-specific spawn options (`NodeSpawnOptions`, `BunSpawnOptions`, `PythonSpawnOptions`). Re-exports `RuntimeKind` and `selectRuntimeKind` from `@scramjet/symbols`.
- **Verser2 networking** (`verser2-transport-configuration.ts`): comprehensive TLS config, broker/guest peer config, timeout/lease settings for both Manager and STH outbound.
- **DTO validators** (`dto/`): endpoint payload shapes for start-sequence and set-instance operations.

## Data & Control Flow

`STHCommandOptions` models parsed CLI flags and flows into merged `STHConfiguration`; runtime config and adapter DTOs feed image/runtime selection and sequence-store adapters. Runtime orchestration types (`BootConfig`, `SpawnOptions`, `RuntimeProcessHandles`, `RuntimeExecutor`) describe the handoff from adapter/runner control plane into child runtime wrappers. Message layer types (`MessageType`, `MessageDataType`, typed message tuples) map `RunnerMessageCode`/`CPMMessageCode` to concrete payload schemas.

The package also exposes runtime-kind selection surface by re-exporting `RuntimeKind` and `selectRuntimeKind` from `@scramjet/symbols` via `runtime-executor.ts`, allowing executor/adapter layers to coordinate on the same node/python3/bun contract.

## Integration Points

Consumed by `@scramjet/sth`, `@scramjet/host`, `@scramjet/manager`, `@scramjet/multi-manager`, adapters, runtime wrapper packages, and API client packages. ~120 source files across 12 subdirectories.

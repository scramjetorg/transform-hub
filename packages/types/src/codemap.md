# packages/types/src/

## Responsibility

Defines the canonical configuration, adapter, messaging, and runtime-executor types shared across STH packages.

## Design/Patterns

Patternized around centralized contract types: protocol-facing message unions/tuples in `messages/*` + `message-streams`, runtime process contract types in `runtime-executor`, and structural config DTOs that support layered merges from env/CLI/stored config.

## Data & Control Flow

CLI options flow into `STHCommandOptions`, merge into `STHConfiguration`, then into runtime-related DTOs that adapters and runners consume. Message layer types (`MessageType`, `MessageDataType`, typed message tuples) map `RunnerMessageCode`/`CPMMessageCode` to concrete payload schemas, while `CommunicationChannel`/stream state enums imported from symbols shape runtime transport wiring and stream lifecycle states.

`runtime-executor.ts` re-exports `RuntimeKind` and `selectRuntimeKind`, wiring `BootConfig` and executor/spawn interfaces directly to the same runtime selection contract used by outer runner and adapters.

## Integration Points

Imported by `sth-config`, `sth`, `runner`, `host`, API/client packages, adapters, and runtime wrappers. Runtime-kind exports are consumed by executor selection logic (`packages/runner/src/executor/select.ts`) and runtime decision helpers (`packages/adapters-common`).

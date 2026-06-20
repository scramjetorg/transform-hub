# packages/multi-manager/src/

## Responsibility

Source entrypoint and directory structure for the Multi-Manager orchestration package. Re-exports the `portsParser` utility as the package's public API surface.

## Design/Patterns

Minimal barrel export (`index.ts` re-exports `portsParser` from `lib/ports-parser`). All other modules are internal and referenced only within the package or via its CLI binary.

## Subdirectories

| Directory | Responsibility |
|-----------|---------------|
| `bin/` | CLI entrypoint (`start.ts`) |
| `config/` | Configuration classes (`MultiManagerConfig`, `MultiManagerServerConfig`) |
| `lib/` | Core orchestration (`MultiManager`, manager store, auditor, ports parser, verser2 host/trust helpers) |
| `lib/api/` | V1 and V2 REST API handlers |
| `types/` | Shared type definitions |

## Data & Control Flow

`index.ts` provides the single public export; consumers import `portsParser` for validating port-range CLI arguments. Internal orchestration entry is `bin/start.ts`.

## Integration Points

Re-exported function `portsParser` is used externally for port-range validation. Internal modules integrate with `@scramjet/manager`, `@signicode/verser2-host`, `@scramjet/api-router`, `@scramjet/rest-api2`, `@scramjet/api-server`, `@scramjet/obj-logger`, `@scramjet/utility`, and `@scramjet/types`.

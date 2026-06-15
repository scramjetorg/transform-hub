# packages/multi-manager/src/

## Responsibility

Source entrypoint and directory structure for the Multi-Manager orchestration package. Re-exports the `portsParser` utility as the package's public API surface.

## Design/Patterns

Minimal barrel export (`index.ts` re-exports `portsParser` from `lib/ports-parser`). All other modules are internal and referenced only within the package or via its CLI binary.

## Data & Control Flow

`index.ts` provides the single public export; consumers import `portsParser` for validating port-range CLI arguments. Internal orchestration entry is `bin/start.ts`.

## Integration Points

Re-exported function `portsParser` is used externally for port-range validation. Internal modules integrate with `@scramjet/manager`, `@signicode/verser2-host`, `@scramjet/api-server`, `@scramjet/obj-logger`, `@scramjet/utility`, and `@scramjet/types`.

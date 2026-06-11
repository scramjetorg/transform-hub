# packages/types/

## Responsibility

Shared type package for CLI options, merged STH configuration, runtime executor contracts, and adapter-facing DTOs.

## Design/Patterns

Pure type surface with structural config models, partial-update friendly shapes, and explicit protocol contracts imported from `@scramjet/symbols`.

## Data & Control Flow

`STHCommandOptions` models parsed CLI flags and flows into merged `STHConfiguration`; runtime config and adapter DTOs feed image/runtime selection and sequence-store adapters. Runtime orchestration types (`BootConfig`, `SpawnOptions`, `RuntimeProcessHandles`, `RuntimeExecutor`) describe the handoff from adapter/runner control plane into child runtime wrappers.

The package also exposes runtime-kind selection surface by re-exporting `RuntimeKind` and `selectRuntimeKind` from `@scramjet/symbols` via `runtime-executor.ts`, allowing executor/adapter layers to coordinate on the same node/python3/bun contract.

## Integration Points

Consumed by `@scramjet/sth-config`, `@scramjet/sth`, `@scramjet/host`, adapters, and runtime wrapper packages.

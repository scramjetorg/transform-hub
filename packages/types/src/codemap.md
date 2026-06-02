# packages/types/src/

## Responsibility

Defines the canonical configuration, adapter, and runtime-executor types shared across STH packages.

## Design/Patterns

Structural object types and narrow union/string-literal contracts; config models stay `DeepPartial`-friendly for file/CLI overlay merges.

## Data & Control Flow

CLI options flow into `STHCommandOptions`, merge into `STHConfiguration`, and runtime execution uses `BootConfig`, `SpawnOptions`, `RuntimeProcessHandles`, and `RuntimeExecutor` to launch child processes and exchange control/monitoring streams.

## Integration Points

Imported by `sth-config`, `sth`, host/adapter code, and runtime wrappers; package metadata now includes bun runtime support in the shared type surface.

# packages/types/

## Responsibility

Shared type package for CLI options, merged STH config, runtime executor contracts, and adapter-facing DTOs.

## Design/Patterns

Pure type surface with structural config models, partial-update friendly shapes, and explicit runtime-kind/image mappings.

## Data & Control Flow

`STHCommandOptions` models parsed CLI flags, `STHConfiguration` models merged runtime state, and runtime executor types describe boot config plus spawn/handle contracts for node, python3, and bun wrappers.

## Integration Points

Consumed by `@scramjet/sth-config`, `@scramjet/sth`, `@scramjet/host`, adapters, and runtime wrapper packages.

# packages/types/src/

## Responsibility

Core configuration and integration types used to assemble, validate, and transport runner/host configuration.

## Design Patterns

Mostly discriminated-by-shape object types plus `DeepPartial`-friendly config models; includes public-safe projections that omit local-only secrets and paths.

## Data & Control Flow

`STHCommandOptions` captures CLI input, `STHConfiguration` captures merged runtime state, and adapter-specific sub-shapes model docker/kubernetes runner image settings.

## Integration Points

Imported by `sth-config`, `sth`, `host`, adapters, and CLI entrypoints for option parsing and config assembly.

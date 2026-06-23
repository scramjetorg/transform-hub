# packages/sth/

## Responsibility

Top-level STH wrapper that owns process-facing lifecycle around a configured host instance and exposes the programmatic STH façade used outside the CLI.

## Design/Patterns

- Thin façade over host startup/stop; caches the active host instance and lets startup failures surface to the process entrypoint.
- Process-wide singleton guard prevents double-starting the same STH façade in one process.
- CLI startup in `src/bin/hub.ts` bypasses the façade and calls host startup after parsing config and Verser2 options.

## Data & Control Flow

Receives `STHConfiguration`, invokes `startHost`, stores the returned host, and delegates `stop()` back to that host instance. CLI flow loads config, augments adapter options, resolves Manager trust/Verser2 configuration, then starts the host directly.

## Integration Points

Exports the `STH` class for callers; depends on `@scramjet/types`, `@scramjet/host`, `@scramjet/sth-config`, and `@scramjet/config` for CLI/configured startup.

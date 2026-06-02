# packages/sth/

## Responsibility

Top-level STH wrapper that owns process-facing lifecycle around a configured host instance.

## Design/Patterns

Thin façade over host startup/stop; caches the active host instance and lets startup failures surface to the process entrypoint.

## Data & Control Flow

Receives `STHConfiguration`, invokes `startHost`, stores the returned host, and delegates `stop()` back to that host instance.

## Integration Points

Exports the `STH` class for callers; depends on `@scramjet/types` and `@scramjet/host`.

# packages/sth/

## Responsibility

Top-level STH wrapper: owns process-facing lifecycle around a configured host instance.

## Design Patterns

Thin façade over host startup/stop; stores the active host instance and propagates startup failures to process exit.

## Data & Control Flow

Receives `STHConfiguration`, calls `startHost`, caches the returned host, and forwards `stop()` to the host instance.

## Integration Points

Exports the `STH` class for callers; depends on `@scramjet/types` and `@scramjet/host`.

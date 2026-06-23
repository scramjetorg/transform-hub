# packages/sth/src/

## Responsibility

Runtime wrapper code for starting STH from a configuration object, plus shared process-wide identity symbols.

## Files

### `index.ts` — `STH` class (29 lines)

Thin wrapper that stores `STHConfiguration`, and on `start()` calls `startHost()` from `@scramjet/host`, caching the returned `Host` instance. `stop()` delegates to `host.stop()`. Startup errors are surfaced to stderr before `process.exit()`.

### `lib/index.ts` (3 lines)

Exports a single `Symbol.for("org.scramjet.hub.instance")` — a process-wide well-known symbol used for hub instance discovery across CLI/bootstrap and runtime coordination.

## Design/Patterns

Minimal orchestration layer plus shared identity exports for process-wide lookup. The `lib/` subdirectory holds only the HUB symbol constant.

## Data & Control Flow

1. `STH` stores config and delegates to `startHost` from `@scramjet/host`.
2. The `HUB` symbol (`lib/index.ts`) is used for process-wide singleton detection — consumers can retrieve the active STH instance via `globalThis[HUB]`.
3. The CLI entrypoint (`bin/hub.ts`) directly calls `startHost` rather than using the `STH` wrapper class.

## Integration Points

- Used by `sth` consumers and the CLI entrypoint; integrates with `@scramjet/host` and `@scramjet/types`.
- `lib/` HUB symbol is referenced from `packages/sth/src/bin/hub.ts` and potentially by adapter/runner bootstrap code for process-wide hub lookups.

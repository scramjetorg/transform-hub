# packages/utility/src/

## Files

| File | Lines | Role |
|------|-------|------|
| `index.ts` | 18 | Barrel re-export of all utility modules. |
| `defer.ts` | — | `defer()` — creates a deferred promise with external resolve/reject. |
| `free-ports-finder.ts` | — | Find available network ports. |
| `keygen.ts` | — | Cryptographic key generation. |
| `merge.ts` | — | Deep recursive object merge (arrays replace, objects recurse, primitives overwrite). |
| `normalize-url.ts` | — | URL normalization wrapping `normalize-url` package. |
| `promise-timeout.ts` | — | Promise with configurable timeout. |
| `process-env.ts` | — | Process environment variable helpers. |
| `read-json-file.ts` | — | Read and parse JSON files. |
| `read-streamed-json.ts` | — | Parse JSON from a readable stream. |
| `refcount.ts` | — | Reference counting utility for resource lifecycle management. |
| `stream-graph.ts` | — | Stream topology analysis and graph construction. |
| `stream-to-string.ts` | — | Collect readable stream content into a string. |
| `typed-emitter.ts` | — | Typed event emitter that wraps Node's EventEmitter with generic event typing. |

### Sub-directories

| Directory | Contents |
|-----------|----------|
| `config/` | Configuration-related utilities. |
| `constants/` | Shared constants including `LogLevelStrings`. |
| `file/` | File abstraction helpers that choose implementations by extension (has its own codemap). |
| `typeguards/` | Runtime type-checking functions (has its own codemap). |
| `validators/` | Data validation utilities. |

## Responsibility

Implements shared utility functions for the STH ecosystem: deferred promises, deep merge, URL normalization, type guards, stream utilities, port finding, key generation, typed events, and reference counting.

## Integration Points

- The `merge` function is consumed by `@scramjet/config`, `@scramjet/sth-config`, `@scramjet/manager-config` for config merging.
- `defer` used across the system for async control flow.
- `LogLevelStrings` from `constants/` is the canonical log level ordering.
- `typed-emitter` used for type-safe event emitters throughout the codebase.

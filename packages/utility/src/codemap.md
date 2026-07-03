# packages/utility/src/

## Files

| File | Lines | Role |
|------|-------|------|
| `index.ts` | 19 | Barrel re-export of all utility modules (18 modules). |
| `defer.ts` | 40 | `defer()` — creates a deferred promise with external resolve/reject; `cancellableDefer()` with `cancel()`. |
| `free-ports-finder.ts` | 83 | `FreePortsFinder` class — finds available TCP/UDP ports in a range. |
| `keygen.ts` | 8 | `generateSTHKey` — cryptographic STH key generation (randomBytes + scryptSync). |
| `merge.ts` | 24 | Deep recursive object merge (arrays replace, objects recurse, primitives overwrite; optional `strict` mode). |
| `normalize-url.ts` | 15 | URL normalization wrapping `normalize-url` package with `http:` default protocol. |
| `promise-timeout.ts` | 15 | `promiseTimeout` — races a promise against a configurable timeout rejection. |
| `process-env.ts` | 17 | `processCommanderRunnerEnvs`, `development` — env string parsing and dev mode detection. |
| `read-json-file.ts` | 21 | Read and parse JSON files via `JsonFile` class. |
| `read-streamed-json.ts` | 22 | Parse JSON from a readable stream. |
| **`request-stream.ts`** | **97** | **New.** `getRequestBytesRead`, `getRequestBytesWritten`, `getRequestRemoteAddress`, `createByteCounterStream`, `onRequestSocketEvent`, `onRequestDisconnect` — utilities for HTTP request stream introspection (socket byte counts, remote address, byte counter transform, disconnect handling). |
| `refcount.ts` | 17 | `RefCountHandler` — reference counting utility for resource lifecycle management. |
| `stream-graph.ts` | 148 | `StreamGraph` class — stream topology analysis (pipe chain walking, circular reference detection). |
| `stream-to-string.ts` | 10 | Collect readable stream content into a string. |
| `typed-emitter.ts` | 7 | `TypedEmitter<Events>` — type-safe event emitter wrapping Node's EventEmitter via `typed-emitter` package. |

### Sub-directories

| Directory | Contents |
|-----------|----------|
| `config/` | Configuration-related utilities (10 files: config, configFile, configuration, readOnly variants). |
| `constants/` | Shared constants including `LogLevelStrings` and object logger constants. |
| `file/` | File abstraction helpers that choose implementations by extension (JSON, text, YAML — has its own codemap). |
| `typeguards/` | Runtime type-checking functions (has its own codemap). |
| `validators/` | Data validation utilities (13 files: schema-driven validators mirroring typeguards). |

## Responsibility

Implements shared utility functions for the STH ecosystem: deferred promises, deep merge, URL normalization, type guards, stream utilities, port finding, key generation, typed events, reference counting, and HTTP request stream introspection.

## Integration Points

- The `merge` function is consumed by `@scramjet/config` for config merging.
- `defer` used across the system for async control flow.
- `LogLevelStrings` from `constants/` is the canonical log level ordering.
- `typed-emitter` used for type-safe event emitters throughout the codebase.
- `request-stream` used for HTTP request byte counting and socket introspection in host/transport layers.

# @scramjet/utility

## Responsibility

Provides a collection of shared utility functions used across Scramjet Transform Hub packages. Covers merge/deep-merge, deferred promises, type guards, validators, URL normalization, stream helpers, free port finding, key generation, HTTP request stream introspection, and more.

## Design / Patterns

- **Zero internal STH dependencies**: The package depends only on external libraries (`normalize-url`, `yaml`), making it a leaf dependency suitable for use by any package without circular dependency risk.
- **Modular file organization**: Each utility category in its own directory/file with a barrel export via `src/index.ts`.
- **TypeScript type guards**: `src/typeguards/` exports runtime type-checking functions for DTO validation, URL/path/port/id validation.
- **Stream utilities**: `stream-to-string`, `stream-graph`, `read-streamed-json`, `request-stream` provide stream processing and HTTP request introspection helpers.
- **Config helpers**: `src/config/` provides configuration-related utilities with read-only and file-backed adapters.

## Module Index

| Module | Description |
|--------|-------------|
| `config/` | Configuration related utilities (read-only, file-backed, default configs). |
| `constants/` | Shared constants (`LogLevelStrings`, object logger constants). |
| `defer` | Deferred promise creation (with cancellable variant). |
| `exponential-backoff` | Transport-neutral cancellable exponential backoff delay generator (`BackoffTimer`, `ExponentialBackoff`, `BackoffPromise`). |
| `file/` | File abstraction helpers by extension (JSON, text, YAML). |
| `free-ports-finder` | Find available TCP/UDP network ports in a range. |
| `keygen` | Cryptographic key generation (scrypt-based STH key). |
| `merge` | Deep recursive object merge (arrays replace, objects recurse, primitives overwrite, optional strict mode). |
| `normalize-url` | URL normalization (wraps `normalize-url` with default `http:` protocol). |
| `promise-timeout` | Promise with configurable timeout rejection. |
| `process-env` | Process environment helpers (env string parsing, dev mode detection). |
| `read-json-file` | JSON file reading via `JsonFile` class. |
| `read-streamed-json` | Streaming JSON parser from a `Readable`. |
| `refcount` | Reference counting utility for resource lifecycle management. |
| `request-stream` | HTTP request stream introspection: socket byte counts, remote address, byte counter transform, disconnect event handling. |
| `stream-graph` | Stream topology analysis (pipe chain walking, circular reference detection). |
| `stream-to-string` | Stream content to string. |
| `typed-emitter` | Typed event emitter wrapper (wraps `typed-emitter` package). |
| `typeguards/` | Runtime type checking (DTO, URL, port, ID, log level, etc.). |
| `validators/` | Data validators mirroring typeguard surface (schema-driven). |

## Integration Points

- Leaf dependency — no internal STH packages in dependency tree.
- Consumed by virtually all STH packages for shared utility needs.
- Types from `@scramjet/types` used in typeguards.
- `merge` consumed by `@scramjet/config`.
- `defer` used across the system for async control flow.
- `LogLevelStrings` from `constants/` is the canonical log level ordering.
- `typed-emitter` used for type-safe event emitters throughout the codebase.
- `request-stream` used for HTTP request byte counting and socket introspection in host/transport layers.

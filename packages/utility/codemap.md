# @scramjet/utility

## Responsibility

Provides a collection of shared utility functions used across Scramjet Transform Hub packages. Covers merge/deep-merge, deferred promises, type guards, validators, URL normalization, stream helpers, free port finding, key generation, and more.

## Design / Patterns

- **Zero internal STH dependencies**: The package depends only on external libraries (`normalize-url`, `yaml`), making it a leaf dependency suitable for use by any package without circular dependency risk.
- **Modular file organization**: Each utility category in its own directory/file with a barrel export via `src/index.ts`.
- **TypeScript type guards**: `src/typeguards/` exports runtime type-checking functions for DTO validation, URL/path/port/id validation.
- **Stream utilities**: `stream-to-string`, `stream-graph`, `read-streamed-json` provide stream processing helpers.
- **Config helpers**: `src/config/` provides configuration-related utilities.

## Module Index

| Module | Description |
|--------|-------------|
| `config/` | Configuration related utilities. |
| `constants/` | Shared constants (`LogLevelStrings`, etc.). |
| `defer` | Deferred promise creation. |
| `file/` | File abstraction helpers by extension. |
| `free-ports-finder` | Find available network ports. |
| `keygen` | Cryptographic key generation. |
| `merge` | Deep recursive object merge. |
| `normalize-url` | URL normalization (wraps `normalize-url`). |
| `promise-timeout` | Promise with configurable timeout. |
| `process-env` | Process environment helpers. |
| `read-json-file` | JSON file reading. |
| `read-streamed-json` | Streaming JSON parser. |
| `refcount` | Reference counting utility. |
| `stream-graph` | Stream topology analysis. |
| `stream-to-string` | Stream content to string. |
| `typed-emitter` | Typed event emitter wrapper. |
| `typeguards/` | Runtime type checking (DTO, URL, port, ID, etc.). |
| `validators/` | Data validators. |

## Integration Points

- Leaf dependency — no internal STH packages in dependency tree.
- Consumed by virtually all STH packages for shared utility needs.
- Types from `@scramjet/types` used in typeguards.

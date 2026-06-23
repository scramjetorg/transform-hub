# packages/api-server/src/lib/

## Responsibility

Core library utilities for the `@scramjet/api-server` Cero-based router: router wrapper, definitions, duplex stream helper, data extraction utilities, and MIME type helpers.

## Modules

| File | Lines | Role |
|------|-------|------|
| `0http.ts` | 16 | Wraps `0http` (Cero) router creation: `sequentialRouter()` for router instances, `cero()` for server+router pair construction. |
| `definitions.ts` | 75 | Shared type definitions: `CeroRouter`, `SequentialCeroRouter`, `CeroConfig`, `CeroMiddleware`, `CeroDefaultRoute`, `CeroError` with typed error codes (`ERR_NOT_FOUND`, `ERR_BAD_GATEWAY`, etc.). |
| `duplex-stream.ts` | 40 | `DuplexStream` class — creates a Node `Duplex` stream from separate input/output `Readable`/`Writable` streams, used by stream handlers for bidirectional endpoints. |
| `data-extractors.ts` | 65 | Utility functions for extracting request data: `getObject()` resolves function or value, `getWritable()`/`getReadable()` extract stream sources/sinks from function or direct values. |
| `mime.ts` | ~10 | MIME type lookup helper. |

## Integration Points

- All modules are consumed internally by `src/index.ts` and the handler factory modules in `handlers/`.
- `CeroError` and `CeroRouter` types are used across handlers and forwarding controllers.
- `DuplexStream` is exported from the package entry point for use by downstream consumers.

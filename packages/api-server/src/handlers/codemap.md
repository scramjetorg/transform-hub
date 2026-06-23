# packages/api-server/src/handlers/

## Responsibility

Route handler factory modules for the `@scramjet/api-server` Cero-based router. Each factory registers typed request handlers (GET, CRUD, operation, stream, forward, routed-forward) on a sequential router.

## Modules

### `get.ts` — `createGetterHandler(router)`

Registers GET-route handlers. Wraps handler functions with request parsing and JSON response serialization. Used for simple read-only endpoints.

### `crud.ts` — `createCrudHandlers(router)`

Registers CRUD-style route handlers (POST create, GET read, PUT update, DELETE remove) for resource-oriented endpoints. Provides structured error responses and status code management.

### `op.ts` — `createOperationHandler(router)`

Registers operation-style endpoint handlers (`router.op(method, path, handler)`). These are action-oriented (POST/PUT/DELETE) endpoints that accept structured request bodies and return operation result DTOs. Used extensively by the v1 REST API for commands like start, stop, kill.

### `stream.ts` — `createStreamHandlers(router)`

Registers stream-oriented route handlers:
- **`upstream(path, source, opts?)`**: Pipes a readable stream source to the HTTP response. Used for logs, audit, monitoring, output, event streams.
- **`downstream(path, sink, opts?)`**: Captures the HTTP request body as a readable stream and pipes it to a writable sink. Used for sequence upload, topic input, stdio write.
- **`duplex(path, handler)`**: Registers a coupled duplex stream handler for bidirectional message exchange (e.g., RPC, platform control channel).

### `forward.ts` — `createForwardController(path, urls, strategy)`

Creates a forwarding middleware controller that proxies HTTP requests to one of the configured target URLs using a pluggable strategy (round-robin, consistent-hash). Used for RPC forwarding to instance-level HTTP servers. Strips the matched base path from the request URL before forwarding.

### `routed-forward.ts` — `forwardRoutedRequest(transport, opts)`

Streaming broker-backed HTTP forwarding without buffering. Used by verser2-based routing:
- Forwards an incoming request body stream through an injected `RoutedForwardTransport`.
- Pipes the routed response back to the client.
- Handles `x-scramjet-route-domain` and `x-scramjet-route-target-path` headers for verser2 redirect.
- Interfaces: `RoutedForwardTransport`, `RoutedForwardTransportResponse`, `RoutedForwardOptions`.
- Exports `normalizeForwardedHeaders()` for header sanitization.

## Integration Points

- All handler factories are imported by `src/index.ts` and wired into `getRouter()` and `createServer()`.
- `forwardRoutedRequest` and `normalizeForwardedHeaders` are re-exported from the package entry point for use by Host/Manager verser2 paths.
- Uses `@scramjet/types` for middleware/next/handler contracts and `CeroError` from `src/lib/definitions.ts`.

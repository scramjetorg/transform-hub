# Package Atlas: api-server

## Responsibility

HTTP API server package for Scramjet Transform Hub. It provides router construction, HTTP/HTTPS server setup, REST/operation/stream handler registration, forwarding controllers, middleware helpers, and routed-forwarding utilities used by host and Manager-facing API surfaces.

## Design/Patterns

- Factory façade: `src/index.ts` exports `getRouter()` and `createServer()` as the primary construction APIs, plus handler, strategy, middleware, and type exports.
- Sequential router adapter: `src/lib/0http.ts` and route handler modules wrap `0http`/router behavior behind Scramjet `APIRoute` and `APIServer` contracts.
- Handler factory pattern: `src/handlers/get.ts`, `crud.ts`, `op.ts`, and `stream.ts` create route registration functions for request/response and stream-oriented endpoints.
- Strategy pattern: `src/strategies/round-robin.ts` and `consistent-hash.ts` provide pluggable target selection for forwarding.
- Defensive middleware wrapping: `safeHandler()` and `safeDecorator()` catch middleware/decorator errors and preserve router error handling.

## Data & Control Flow

1. Consumers call `getRouter()` for an in-memory route surface or `createServer(conf)` for an HTTP/HTTPS server-backed API surface.
2. Handler factories register endpoint callbacks on the sequential router; stream handlers map duplex/upstream/downstream APIs onto Node streams.
3. Incoming requests pass through global decorators/middleware, route lookup, and handler-specific parsing/extraction helpers from `src/lib/`.
4. Forwarding paths use either URL-based forwarding controllers or `forwardRoutedRequest()` to stream a request body through an injected routed transport and pipe the routed response back to the client.
5. Server request completion writes structured log records to a `scramjet` `DataStream`, which auto-resumes until a consumer reads it.

## Integration Points

- Consumed by `packages/host`, Manager/instance API code, and tests that need a local API server/router abstraction.
- Depends on `@scramjet/types` route/server contracts, `@scramjet/obj-logger`, `@scramjet/symbols`, `@scramjet/utility`, `0http`, and `scramjet` streams.
- Verser2 rollout additions use `src/handlers/routed-forward.ts` for streaming broker-backed HTTP forwarding without relying on test-only buffering paths.
- Package-level AVA tests under `test/` cover server behavior, REST/stream methods, forwarding, and routed-forward semantics.

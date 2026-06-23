# packages/api-server/src/

## Responsibility

API server runtime surface for request routing, middleware wrapping, forwarding, and HTTP/HTTPS server setup.

## Design/Patterns

- Central factory module that re-exports router/server helpers and strategy implementations.
- Wraps middleware/decorators with error guards to protect the router pipeline.
- Builds the server from a config object, preferring injected server instances before creating HTTP/HTTPS servers.
- Handler registrations: `getRouter()` and `createServer()` return objects with `get`, `op`, `crud`, `duplex`, `upstream`, `downstream`, `use`, `decorate`, `forward` methods.
- Stream-based logging: server request completion logs to a `DataStream` that pauses only when explicitly accessed.
- Exports `forwardRoutedRequest` and `normalizeForwardedHeaders` from `src/handlers/routed-forward` for verser2-backed streaming forwarding.

## Data & Control Flow

- `getRouter()` creates a sequential router and wires GET/CRUD/op/stream handlers plus forwarding via handler factories in `handlers/`.
- `createServer()` constructs the router/server pair, installs error/default handlers, then logs request completion.
- Logging is buffered through a `DataStream` that pauses when `.log` is first accessed.

## Subdirectories

| Directory | Responsibility |
|-----------|---------------|
| `config/` | Server configuration validation (SSL, ports) |
| `handlers/` | Route handler factories: GET, CRUD, operation, stream, forward, routed-forward |
| `lib/` | `0http` router wrapper, definitions, duplex stream helper, data extractors, mime helpers |
| `middlewares/` | CORS, OPTIONS pre-flight middleware |
| `strategies/` | Forwarding strategies: round-robin, consistent-hash |
| `types/` | TypeScript interfaces for API server contracts (`ServerConfig`) |

## Integration Points

- Uses `@scramjet/types` for API route/server contracts and parser types.
- Uses `scramjet` `DataStream` for request logging.
- Integrates with local handlers, stream middleware, and forwarding strategies.
- `forwardRoutedRequest` / `normalizeForwardedHeaders` exported for verser2 routed-forward use by Host/Manager.
- Consumed by Host, Manager, and MultiManager for their HTTP API surfaces.

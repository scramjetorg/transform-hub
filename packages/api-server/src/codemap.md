# packages/api-server/src/

## Responsibility

API server runtime surface for request routing, middleware wrapping, forwarding, and HTTP/HTTPS server setup.

## Design/Patterns

- Central factory module that re-exports router/server helpers and strategy implementations.
- Wraps middleware/decorators with error guards to protect the router pipeline.
- Builds the server from a config object, preferring injected server instances before creating HTTP/HTTPS servers.
- Handler registrations: `getRouter()` and `createServer()` return objects with `get`, `op`, `crud`, `duplex`, `upstream`, `downstream`, `use`, `forward` methods.
- Stream-based logging: server request completion logs to a `DataStream` that pauses only when explicitly accessed.

## Data & Control Flow

- `getRouter()` creates a sequential router and wires GET/CRUD/op/stream handlers plus forwarding via handler factories in `handlers/`.
- `createServer()` constructs the router/server pair, installs error/default handlers, then logs request completion.
- Logging is buffered through a `DataStream` that pauses when `.log` is first accessed.

## Subdirectories

| Directory | Responsibility |
|-----------|---------------|
| `config/` | Server configuration validation (SSL, ports) |
| `handlers/` | Route handler factories: GET, CRUD, operation, stream, forward, routed-forward |
| `lib/` | `0http` router wrapper, duplex stream helper |
| `middlewares/` | CORS, OPTIONS pre-flight middleware |
| `strategies/` | Forwarding strategies: round-robin, consistent-hash |
| `types/` | TypeScript interfaces for API server contracts |

## Integration Points

- Uses `@scramjet/types` for API route/server contracts and parser types.
- Uses `scramjet` `DataStream` for request logging.
- Integrates with local handlers, stream middleware, and forwarding strategies.
- Consumed by Host, Manager, and MultiManager for their HTTP API surfaces.

# Package Atlas: api-server/src

## Responsibility

API server runtime surface for request routing, middleware wrapping, forwarding, and HTTP/HTTPS server setup.

## Design/Patterns

- Central factory module that re-exports router/server helpers and strategy implementations.
- Wraps middleware/decorators with error guards to protect the router pipeline.
- Builds the server from a config object, preferring injected server instances before creating HTTP/HTTPS servers.

## Data & Control Flow

- `getRouter()` creates a sequential router and wires GET/CRUD/op/stream handlers plus forwarding.
- `createServer()` constructs the router/server pair, installs error/default handlers, then logs request completion.
- Logging is buffered through a `DataStream` that pauses only when explicitly accessed.

## Integration Points

- Uses `@scramjet/types` for API route/server contracts and parser types.
- Uses `scramjet` `DataStream` for request logging.
- Integrates with local handlers, stream middleware, and forwarding strategies.

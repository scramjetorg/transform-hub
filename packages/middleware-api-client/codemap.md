# @scramjet/middleware-api-client

## Responsibility

Provides the Middleware API client for space-level Manager routing. The `MiddlewareClient` wraps `@scramjet/client-utils` to communicate with the Middleware API, and can create `ManagerClient` instances for specific spaces.

## Design / Patterns

- **Space routing**: `getManagerClient(id)` constructs a `ManagerClient` with an API base pointing to `/space/{id}/api/v1`, routing through the Middleware layer.
- **Thin delegation**: `MiddlewareClient` is a lightweight wrapper — its primary value is constructing correctly-routed sub-clients for Manager and Host access.
- **ClientProvider**: Implements `ClientProvider` interface exposing the underlying `HttpClient`.

## Integration Points

- Depends on `@scramjet/api-client` (for `ManagerClient`), `@scramjet/client-utils` (HTTP transport).
- Types from `@scramjet/types` (`MWRestAPI`, `MMRestAPI`).
- Used by CLI and UI tooling for Middleware-intermediated cluster access.

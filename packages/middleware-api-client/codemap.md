# @scramjet/middleware-api-client

## Responsibility

Provides the Middleware API client for space-level Manager routing. The `MiddlewareClient` wraps `@scramjet/client-utils` to communicate with the Middleware API, and can create `ManagerClient` instances for specific spaces. Also supports access key lifecycle management (list, create, revoke).

## Design / Patterns

- **Space routing**: `getManagerClient(id)` constructs a `ManagerClient` with an API base pointing to `/space/{id}/api/v1`, routing through the Middleware layer.
- **Thin delegation**: `MiddlewareClient` is a lightweight wrapper — its primary value is constructing correctly-routed sub-clients for Manager and Host access.
- **ClientProvider**: Implements `ClientProvider` interface exposing the underlying `HttpClient`.
- **Access key management**: `listAccessKeys(spaceId)`, `createAccessKey(spaceId, opts)`, `revokeAccessKey(spaceId, accessKey)`, `revokeAllAccessKeys(spaceId)` — Middleware-specific operations.
- **Stream support**: `getAuditStream()` returns a readable stream of audit data.

## Source Files

| File | Lines | Role |
|------|-------|------|
| `src/index.ts` | 1 | Barrel re-export of middleware-client |
| `src/middleware-client.ts` | 93 | `MiddlewareClient` class |

## Integration Points

- Depends on `@scramjet/api-client` (for `ManagerClient`, `createHostClient`), `@scramjet/client-utils` (HTTP transport, `ClientUtilsCustomAgent`).
- Types from `@scramjet/types` (`MWRestAPI`, `MMRestAPI`).
- Used by CLI and UI tooling for Middleware-intermediated cluster access.

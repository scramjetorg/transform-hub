# packages/middleware-api-client/src/

## Responsibility

Source files for the `@scramjet/middleware-api-client` package: typed HTTP API client for Middleware-intermediated space-level Manager routing and access key management.

## Files

| File | Lines | Role |
|------|-------|------|
| `index.ts` | 1 | Barrel re-export of `middleware-client.ts` |
| `middleware-client.ts` | 93 | `MiddlewareClient` class |

## Key Methods

- `getManagerClient(id)`: Creates a proxied `ManagerClient` routed through `/space/{id}/api/v1`.
- `getManagers()`: Lists managers via `GET /spaces`.
- `getVersion()`: API version info.
- `getAuditStream()`: Readable stream of audit data.
- `listAccessKeys(spaceId)`, `createAccessKey(spaceId, opts)`, `revokeAccessKey()`, `revokeAllAccessKeys()`: Access key lifecycle management.

## Integration Points

- Uses `@scramjet/api-client` (`ManagerClient`, `createHostClient`), `@scramjet/client-utils`, `@scramjet/types`.

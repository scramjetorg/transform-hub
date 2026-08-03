# packages/multi-manager-api-client/src/

## Responsibility

Source files for the `@scramjet/multi-manager-api-client` package: typed HTTP API client for the MultiManager control plane.

## Files

| File | Lines | Role |
|------|-------|------|
| `index.ts` | 1 | Barrel re-export of `multi-cpm-client.ts` |
| `multi-cpm-client.ts` | 53 | `MultiManagerClient` class |

## Key Methods

- `getManagerClient(id)`: Creates a proxied `ManagerClient` pointing to `/cpm/{id}/api/v1`.
- `startManager(config)`: POSTs a `DeepPartial<ManagerConfiguration>` to `/api/v1/start`, returns `ManagerClient`.
- `getManagers()`: Lists Managers via `GET /list`.
- `getVersion()`: API version info.
- `getLoad()`: Load check stats.
- `getLogStream()`: Log stream.
- `getInfo()`: MultiManager info.

## Integration Points

- Uses `@scramjet/api-client` (`ManagerClient`, `createHostClient`), `@scramjet/client-utils`, `@scramjet/types`.

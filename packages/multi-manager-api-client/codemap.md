# @scramjet/multi-manager-api-client

## Responsibility

Provides the MultiManager API client for starting and managing sub-Managers through the MultiManager control plane. `MultiManagerClient` wraps `@scramjet/client-utils` HTTP layer with MultiManager-specific operations.

## Design / Patterns

- **Sub-Manager lifecycle**: `startManager(config)` POSTs a `DeepPartial<ManagerConfiguration>` to create a sub-Manager, returns a `ManagerClient` for the new Manager.
- **Manager routing**: `getManagerClient(id)` constructs a `ManagerClient` pointing to `/cpm/{id}/api/v1`.
- **ClientProvider**: Implements `ClientProvider` interface.
- **Thin API surface**: Focuses on multi-Manager-specific operations (start, list, version, load, log, info) while delegating per-Manager operations to `@scramjet/api-client`.

## Source Files

| File | Lines | Role |
|------|-------|------|
| `src/index.ts` | 1 | Barrel re-export of multi-cpm-client |
| `src/multi-cpm-client.ts` | 53 | `MultiManagerClient` class |

## Integration Points

- Depends on `@scramjet/api-client` (for `ManagerClient`, `createHostClient`), `@scramjet/client-utils` (HTTP transport).
- Types from `@scramjet/types` (`MMRestAPI`, `ManagerConfiguration`, `LoadCheckStat`).
- Used by `@scramjet/middleware-api-client` and CLI/UI tooling that interfaces with the MultiManager API.

# @scramjet/multi-manager-api-client

## Responsibility

Provides the MultiManager API client for starting and managing sub-Managers through the MultiManager control plane. `MultiManagerClient` wraps `@scramjet/client-utils` HTTP layer with MultiManager-specific operations.

## Design / Patterns

- **Sub-Manager lifecycle**: `startManager(config)` POSTs a `DeepPartial<ManagerConfiguration>` to create a sub-Manager, returns a `ManagerClient` for the new Manager.
- **Manager routing**: `getManagerClient(id)` constructs a `ManagerClient` pointing to `/cpm/{id}/api/v1`.
- **ClientProvider**: Implements `ClientProvider` interface.
- **Thin API surface**: Focuses on multi-Manager-specific operations (start, list, proxy) while delegating per-Manager operations to `@scramjet/api-client`.

## Integration Points

- Depends on `@scramjet/api-client` (for `ManagerClient`), `@scramjet/client-utils` (HTTP transport).
- Types from `@scramjet/types` (`MMRestAPI`, `ManagerConfiguration`, `LoadCheckStat`).
- Used by `@scramjet/middleware-api-client` and CLI/UI tooling that interfaces with the MultiManager API.

# @scramjet/api-client

## Responsibility

Provides typed HTTP API client classes for interacting with Scramjet Transform Hub Host, Instance, Sequence, and Manager REST endpoints. Each client wraps `@scramjet/client-utils` HTTP layer with domain-specific methods. Supports both v1 and v2 API surfaces via dual client instances.

## Design / Patterns

- **Domain-specific clients**: Separate classes for each API surface — `HostClient`, `InstanceClient`, `SequenceClient`, `ManagerClient`.
- **ClientProvider pattern**: Each client implements `ClientProvider` (exposes `.client` of type `HttpClient`) and provides domain methods that delegate to the HTTP client.
- **Dual API version support**: `HostClient` and `ManagerClient` maintain private `#_v2Client` instances for v2 API calls (auto-derived by replacing `/api/v1/` with `/api/v2/` in the base path). Methods like `getStatus()`, `getConfig()`, `getAllSequences()`, `getSequences()`, `getInstances()` use v2 endpoints with `{items: ...}` response unwrapping.
- **Manager-to-Host routing**: `ManagerClient.getHostClient(id)` creates a proxied `HostClient` that routes through the Manager's STH proxy path (`/sth/{id}/api/v1`). Accepts optional `hostClientFactory` parameter.
- **Factory support**: `ManagerClient` constructor accepts a `hostClientFactory` and `v2Utils` for flexible dependency injection. `HostClient` constructor accepts optional `v2Utils` parameter.

## Source Files

| File | Role |
|------|------|
| `host-client.ts` | Interact with Host API — sequence list/upload, instance CRUD, topic management, load stats, event stream. Supports v2 status/config endpoints. |
| `instance-client.ts` | Interact with a specific running Instance — stdin/stdout/stderr streams, monitoring events, health, RPC client. |
| `sequence-client.ts` | Interact with a stored Sequence — metadata, delete, start, overwrite. |
| `manager-client.ts` | Interact with Manager API — list connected STH hosts, host client proxy, v2-based config/sequences/instances queries, store operations (S3 CRUD), hub disconnect/delete. |

## Integration Points

- Consumed by `@scramjet/middleware-api-client`, `@scramjet/multi-manager-api-client`, and higher-level CLI/tooling.
- Depends on `@scramjet/client-utils` (HTTP transport, `ClientUtils`, `ClientUtilsCustomAgent`), `@scramjet/symbols` (headers), `@scramjet/types` (API types), `scramjet` (streams), `n-readlines`.

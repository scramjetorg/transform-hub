# @scramjet/api-client

## Responsibility

Provides typed HTTP API client classes for interacting with Scramjet Transform Hub Host, Instance, Sequence, and Manager REST endpoints. Each client wraps `@scramjet/client-utils` HTTP layer with domain-specific methods.

## Design / Patterns

- **Domain-specific clients**: Separate classes for each API surface — `HostClient`, `InstanceClient`, `SequenceClient`, `ManagerClient`.
- **ClientProvider pattern**: Each client implements `ClientProvider` (exposes `.client` of type `HttpClient`) and provides domain methods that delegate to the HTTP client.
- **Manager-to-Host routing**: `ManagerClient.getHostClient(id)` creates a proxied `HostClient` that routes through the Manager's STH proxy path (`/sth/{id}/api/v1`).

## Source Files

| File | Role |
|------|------|
| `host-client.ts` | Interact with Host API — sequence list/upload, instance CRUD, topic management, load stats, event stream. |
| `instance-client.ts` | Interact with a specific running Instance — stdin/stdout/stderr streams, monitoring events, health. |
| `sequence-client.ts` | Interact with a stored Sequence — metadata, delete. |
| `manager-client.ts` | Interact with Manager API — list connected STH hosts, get host client proxy, load stats. |

## Integration Points

- Consumed by `@scramjet/middleware-api-client`, `@scramjet/multi-manager-api-client`, and higher-level CLI/tooling.
- Depends on `@scramjet/client-utils` (HTTP transport), `@scramjet/symbols` (headers), `scramjet` (streams), `n-readlines`.

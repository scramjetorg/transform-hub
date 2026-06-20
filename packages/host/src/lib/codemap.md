# packages/host/src/lib/

## Responsibility

Core host runtime library for API orchestration (v1 + v2), sequence and instance state, verser2 runner transport, and control-plane integrations.

This layer is the runtime heart of a Host node: it boots runtime adapters, exposes endpoints/events (both v1 and v2 REST), tracks local sequence/instance lifecycles, and bridges to platform services.

## Directory Map

| Directory | Responsibility |
|-----------|---------------|
| `api/` | V1 and V2 REST API handlers (`HostAPIV1Handler`, `HostAPIV2Handler`, `InstanceAPI`, `InstanceAPIV2`) |
| `types/` | TypeScript interfaces (`IHost`, `ICSI`, store types) |
| `handlers/` | Audit stream handler |
| `middlewares/` | Audit logging middleware |
| `serviceDiscovery/` | Topic-based pub/sub (topic router, topic IDs, content-type validation, SD adapter) |
| `local-storage/` | Local filesystem store support |

## Design/Patterns

- **Central `Host` class**: Coordinates immutable config, event bus, logging, telemetry, and async lifecycle.
- **Controller/dispatcher split**:
  - `CSIController` handles persisted instance lifecycle operations and status transitions.
  - `CSIDispatcher` schedules dispatch/monitoring against a runtime adapter.
- **Store abstractions** (`SequenceStore`, `InstanceStore`): Persist and synchronize objects.
- **verser2-driven runner control plane**: Explicit channel handlers for runner transport (`runner-transport.ts`, `runner-verser2-host-config.ts`, `runner-verser2-host-peers.ts`).
- **Observer/connector pattern**: `CPMConnector` drives external platform events and host registration.
- **V1 + V2 API**: `HostAPIHandler` composes `HostAPIV1Handler` (legacy Cero handlers) and `HostAPIV2Handler` (v2 contracts via `@scramjet/api-router`). `/api` directory holds both.

## Data & Control Flow

- `Host.main()` sequence:
  1. initialize telemetry/logging + API request logging,
  2. optionally identify existing sequences,
  3. `initializeRuntimeAdapters(...)`,
  4. initialize local storage and runner verser2 Host when enabled,
  5. attach listeners/handlers and start listening on host API,
  6. connect to CPM (if configured), then run startup sequences.
- Incoming run requests pass through REST handlers into `CSIController`/`CSIDispatcher`, which resolves sequence package via store, provisions runner verser2 routing, and delegates execution to adapter.
- Runtime completion or failures flow back through event bus, persisted instance state, audit logs, and optional platform connectors.
- `performStop` and `stop` perform graceful shutdown of servers, in-flight instances, and cleanup hooks.

## Integration Points

- Integrates with runtime adapters from `@scramjet/runner` through adapter initialization.
- Depends on `serviceDiscovery/sd-adapter.ts` for topic registration and space service announcements.
- Connects optional CPM platform using `cpm-connector.ts` and host identification APIs.
- Writes/reads files via `sequence-store.ts`, `instance-store.ts`, and `s3-client.ts`.
- Uses `auditor.ts` and `common-logs-pipe.ts` for compliance/audit and log routing.
- V2 API depends on `@scramjet/api-router` and `@scramjet/rest-api2`.

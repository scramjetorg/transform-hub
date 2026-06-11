# Package Atlas: host/src/lib

## Responsibility
Core host runtime library for API/socket orchestration, sequence and instance state, and control-plane integrations.

This layer is the runtime heart of a Host node: it boots runtime adapters, exposes endpoints/events, tracks local sequence/instance lifecycles, and bridges to platform services.

## Design/Patterns
- Central `Host` class coordinates immutable config, event bus, logging, telemetry, and async lifecycle.
- Controller/dispatcher split:
  - `CSIController` handles persisted instance lifecycle operations and status transitions.
  - `CSIDispatcher` schedules dispatch/monitoring against a runtime adapter.
- Store abstractions (`SequenceStore`, `InstanceStore`) persist and synchronize objects.
- Socket-driven control plane using `SocketServer` with explicit channel handlers.
- Observer/connector pattern: `CPMConnector` drives external platform events and host registration.

## Data & Control Flow
- `Host.main()` sequence:
  1. initialize telemetry/logging + API request logging,
  2. optionally identify existing sequences,
  3. `initializeRuntimeAdapters(...)`,
  4. initialize local storage and start socket server,
  5. attach listeners/handlers and start listening on host API,
  6. connect to CPM (if configured), then run startup sequences.
- Incoming run requests pass through `SocketServer`/REST handlers into `CSIController`/`CSIDispatcher`, which resolves sequence package via store and delegates execution to adapter.
- Runtime completion or failures flow back through event bus, persisted instance state, audit logs, and optional platform connectors.
- `performStop` and `stop` perform graceful shutdown of servers, in-flight instances, and cleanup hooks.

## Integration Points
- Integrates with runtime adapters from `@scramjet/runner` through adapter initialization.
- Depends on `serviceDiscovery/sd-adapter.ts` for topic registration and space service announcements.
- Connects optional CPM platform using `cpm-connector.ts` and host identification APIs.
- Writes/reads files via `sequence-store.ts`, `instance-store.ts`, and `s3-client.ts`.
- Uses `auditor.ts` and `common-logs-pipe.ts` for compliance/audit and log routing.

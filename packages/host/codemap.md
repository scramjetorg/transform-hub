# packages/host/

## Responsibility

Host package implementing the Scramjet Transform Hub node runtime: API exposure, sequence and instance lifecycle coordination, service discovery, platform connectivity, local storage, socket control channels, and runtime adapter integration.

## Design/Patterns

- Central host orchestrator pattern through `src/lib/host.ts`.
- Controller/dispatcher split for sequence instance lifecycle and adapter execution.
- Store abstractions for local sequence and instance registries.
- Connector pattern for optional Manager/CPM platform connectivity.
- Cero/API handler composition for REST surface wiring.

## Data & Control Flow

1. Public package entrypoints instantiate or export host runtime components.
2. `Host.main()` initializes telemetry/logging, storage, runtime adapters, socket server, API handlers, and optional platform connection.
3. REST/socket requests dispatch into lifecycle controllers and runtime adapters.
4. Instance events, logs, audit records, and service-discovery updates flow back through host stores, API streams, and optional Manager connectivity.

## Integration Points

- Consumed by `@scramjet/sth` as the main hub runtime.
- Depends on `@scramjet/types`, adapters, object logging, API server, model, and utility packages.
- Integrates with `@scramjet/manager` through `CPMConnector` when platform connectivity is configured.
- Detailed runtime map: [src/lib](src/lib/codemap.md).

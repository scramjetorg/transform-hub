# packages/host/

## Responsibility

Host package implementing the Scramjet Transform Hub node runtime: API exposure (v1 and v2), sequence and instance lifecycle coordination, service discovery, platform connectivity, local storage, socket control channels, and runtime adapter integration.

## Design/Patterns

- **Central host orchestrator**: `src/lib/host.ts` coordinates immutable config, event bus, logging, telemetry, and async lifecycle.
- **Controller/dispatcher split**: `CSIController` handles persisted instance lifecycle operations; `CSIDispatcher` schedules dispatch/monitoring against a runtime adapter.
- **V1 + V2 API handlers**: `src/lib/api/host-api.ts` composes `HostAPIV1Handler` (legacy REST) and `HostAPIV2Handler` (v2 REST via `@scramjet/api-router` contracts). Instance-level v2 handled by `InstanceAPIV2` via `ICSI.v2Router`.
- **Store abstractions**: `SequenceStore`, `InstanceStore` for local sequence and instance registries.
- **Connector pattern with reconnect supervisor**: `CPMConnector` for optional Manager/CPM platform connectivity via verser2 guest-node. Uses a single shared async retry loop (`reconnectPromise`) that coalesces multiple close/error notifications, generation-gated stream ownership to reject stale events, and transport-neutral cancellable exponential backoff (`ExponentialBackoff` from `@scramjet/utility`) with abandonment lifecycle via `isAbandoned`.
- **verser2 runner control plane**: Explicit channel handlers for runner transport with verser2 host peers (`runner-transport.ts`, `runner-verser2-host-config.ts`, `runner-verser2-host-peers.ts`).
- **Host identity management**: `src/lib/host-id.ts` provides three-tier stable ID resolution (explicit → persisted file → auto-generated UUID), consumed by CPM registration and runner verser2 broker peerId derivation.
- **Self-signed TLS identity**: `src/lib/runner-verser2-host-config.ts` auto-generates CA + server certificates for the STH-local runner verser2 Host when explicit TLS is not configured, with automatic SAN derivation from publicUrl/bindHost.

## Data & Control Flow

1. `Host.main()` initializes telemetry/logging, storage, runtime adapters, socket server, API handlers (v1+v2), and optional platform connection.
2. REST/socket requests dispatch into lifecycle controllers and runtime adapters. v1 and v2 routes coexist on the same API surface.
3. Instance events, logs, audit records, and service-discovery updates flow back through host stores, API streams, and optional Manager connectivity.
4. v2 route dispatch goes through `registerHttpRoutes()` with `@scramjet/api-router` adapters; v1 uses direct `api.get/op/upstream/downstream` registration.

## Integration Points

- Consumed by `@scramjet/sth` as the main hub runtime.
- Depends on `@scramjet/types`, adapters, object logging, API server, model, and utility packages.
- Integrates with `@scramjet/manager` through `CPMConnector` when platform connectivity is configured.
- V2 API depends on `@scramjet/api-router` (route contracts, adapters) and `@scramjet/rest-api2` (route sets, schemas).
- Detailed runtime map: [src/lib](src/lib/codemap.md).

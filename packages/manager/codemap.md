# @scramjet/manager Package

## Responsibility
The Manager is the central orchestrator in a Scramjet Transform Hub cluster. It manages STH (Scramjet Transform Hub) node connections, routes API requests to connected hosts, maintains a global registry of sequences/instances/topics across all connected STHs, provides a REST API (v1 and v2) for cluster-wide operations, and optionally proxies uploaded sequences to S3-compatible storage or local disk.

## Design / Patterns
- **STH (Host) Connection Management**: Each connected STH is wrapped in an `STHController` instance; the `SthConnectionStore` holds the active map of controllers by ID. Supports transparent STH reconnection and id-based deduplication.
- **API Routing via Cero**: The `@scramjet/api-server` Cero-based router is used for both Manager-level endpoints and STH request proxying.
- **Verser-based Transport**: Communication with each STH uses Verser connections. `Verser2ManagerSthBrokerTransport` provides a Verser2-based transport layer for routed request/response between Manager and STH.
- **Aggregated State**: `STHInfoRegister` maintains a three-level map: Host → Sequence → Instance Set. `ServiceDiscovery` manages topic-based pub/sub wiring across host and API actors.
- **Storage Abstraction**: `s3-router.ts` selects between `S3Proxy` (Minio client) or `DiskProxy` (local filesystem). Both share the same router-based API for sequence upload, retrieval, and deletion.
- **Health & Audit**: `HealthCheck` and `ManagerAuditor` multiplex audit streams from all connected STHs plus own heartbeat.
- **Event Bus Pattern**: The Manager is a typed event emitter that forwards STH-originated events to all other connected STHs.
- **V1 + V2 API**: `manager-api.ts` composes `ManagerAPIV1Handler` (legacy Cero handlers) and `ManagerAPIV2Handler` (v2 contracts via `@scramjet/api-router`). V2 uses verser2 redirect resolver for Hub-owned routes.
- **Route Classification**: `route-classifier.ts` provides `classifyManagerRoute()` for determining whether a Manager route is owned locally, forwarded to an STH, or multiplexed across all STHs.

## Data & Control Flow
```
Startup:
  start-manager.ts → new Manager()
    → Manager constructor sets up:
        - Router (Cero)
        - SthConnectionStore, STHInfoRegister, ServiceDiscovery
        - CommonLogsPipe, LoadCheck, ManagerAuditor
        - S3 client or disk fallback
    → manager.main() → new ManagerAPIHandler().attach() (registers v1 + v2 routes)
    → manager.main() resolves startedPromise

STH Connection (Verser):
  Manager.handleHostConnection(id, verserConnection)
    → Checks for duplicate ID (reconnect vs new)
    → Creates/reuses STHController
    → STHController.init() → reconnect() → establishes:
        - /api/v1/platform (upstream/downstream CPM message channel)
        - /api/v1/log (log stream)
    → Registers in SthConnectionStore
    → Attaches event handlers (events, sequences, instances, topics, disconnect)
    → Auditor registers hub connection change

API Request Routing (v1):
  HTTP request → Manager.router → /api/v1/sth/:id/*
    → Manager.handleRequestToSTH(req, res)
    → Forwards via ManagerSthBrokerTransport over verser
    → STHController handles and responds

API Request Routing (v2):
  HTTP request → Manager.router → /api/v2/...
    → ManagerAPIV2Handler routes registered via registerHttpRoutes()
    → Hub-owned routes resolved via verser2 redirect resolver
    → Space-owned routes handled by Manager directly
    → Topic/audit/log streams multiplexed across connected STHs

CPM Message Flow (STH → Manager):
  STHController.hookupStream() → StringStream from communicationChannel
    → hostMessageHandler dispatches by CPMMessageCode
```

## Integration Points
- **`@scramjet/api-server`**: Cero-based router for all HTTP API endpoints.
- **`@scramjet/api-router`**: Route contracts, binding, and HTTP adapter for v2 API registration.
- **`@scramjet/rest-api2`**: V2 route sets and schemas for Space-owned and Hub-owned routes.
- **`@signicode/verser2-guest-node` / `@signicode/verser-common`**: verser2 broker/guest transport for STH communication.
- **`@scramjet/types`**: Interfaces for STH controllers, connection stores, info registers, service discovery, API REST types, and CPM message types.
- **`@scramjet/symbols`**: Shared enum constants.
- **`@scramjet/api-client` / `@scramjet/client-utils`**: `HostClient` used by `STHController`.
- **`@scramjet/obj-logger`**: Structured logging.
- **`@scramjet/manager-config`**: Default configuration.
- **`@scramjet/model`**: `IDProvider`.
- **`@scramjet/load-check`**: OS resource load checking.
- **`@scramjet/adapter-process`**: Sequence package identification.
- **`minio`**: S3-compatible client.
- **`rereadable-stream`**: Re-readable buffers for multi-consumer output streams.
- **`scramjet`**: DataStream/StringStream for stream processing.

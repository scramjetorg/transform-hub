# @scramjet/manager Package

## Responsibility
The Manager is the central orchestrator in a Scramjet Transform Hub cluster. It manages STH (Scramjet Transform Hub) node connections, routes API requests to connected hosts, maintains a global registry of sequences/instances/topics across all connected STHs, provides a REST API (v1 and v2) for cluster-wide operations, and optionally proxies uploaded sequences to S3-compatible storage or local disk.

## Design / Patterns
- **STH Connection Management**: Each connected STH is wrapped in an `STHController` instance; the `SthConnectionStore` holds the active map of controllers by ID. Supports transparent STH reconnection, id-based deduplication, and registration payload with `description`, `tags`, `accessKey`, and `routeDomain` fields.
- **API Routing via Cero**: The `@scramjet/api-server` Cero-based router is used for both Manager-level endpoints and STH request proxying.
- **Verser2 Transport**: `Verser2ManagerSthBrokerTransport` provides Verser2-based broker transport layer for routed request/response between Manager and STH. Supports route readiness polling, duplicate route detection, and AbortSignal propagation.
- **Aggregated State**: `STHInfoRegister` maintains a three-level map: Host → Sequence → Instance Set. Tracks `hubId`, `location`, `sequenceId` metadata on aggregated instances. `HubInventoryState` tracks per-hub sequence/instance receipt completeness.
- **Storage Abstraction**: `s3-router.ts` selects between `S3Proxy` (Minio client) or `DiskProxy` (local filesystem). Both share the same router-based API for sequence upload, retrieval, and deletion.
- **Health & Audit**: `HealthCheck` and `ManagerAuditor` multiplex audit streams from all connected STHs plus own heartbeat. V2 health check includes aggregation readiness components and hub-by-hub health breakdown.
- **Event Bus Pattern**: The Manager is a typed event emitter that forwards STH-originated events to all other connected STHs.
- **V1 + V2 API**: `manager-api.ts` composes `ManagerAPIV1Handler` (legacy Cero handlers with v1 compatibility routes) and `ManagerAPIV2Handler` (v2 contracts via `@scramjet/api-router` and `@scramjet/rest-api2`). V2 uses verser2 redirect resolver for Hub-owned routes with hub delete/disconnect, storage operations, and topic stream support.
- **Route Classification**: `route-classifier.ts` provides `classifyManagerRoute()` for determining whether a Manager route is owned locally, forwarded to an STH (redirect or direct-route-metadata), or multiplexed across all STHs. Includes `prepareManagerFollowForwarding()` for constructing redirect targets.
- **STH Identity/Registration**: Registration payload includes `enrollmentToken` validation against verser2 config. Supports re-registration with controller reuse and rollback on failure.

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

STH Connection (Verser2):
  Manager.handleHostConnection(id, verserConnection)
    → Checks for duplicate ID (reconnect vs new)
    → Creates/reuses STHController with description, tags, accessKey, routeDomain
    → STHController.init() → reconnect() → establishes:
        - /api/v1/platform (upstream/downstream CPM message channel)
        - /api/v1/log (log stream)
    → Registers in SthConnectionStore
    → Attaches event handlers (events, sequences, instances, topics, disconnect)
    → Auditor registers hub connection change
    → CommonLogsPipe.addInStream() for aggregated log output

API Request Routing (v1):
  HTTP request → Manager.router → /api/v1/sth/:id/*
    → Manager.handleRequestToSTH(req, res)
    → classifyManagerRoute() → "follow" decision
    → prepareManagerFollowForwarding() → redirect (location) or direct-route-metadata
    → STH Controller handles via verser2 broker transport

API Request Routing (v2):
  HTTP request → Manager.router → /api/v2/...
    → ManagerAPIV2Handler routes registered via registerHttpRoutes()
    → Space-owned routes (version, config, health, list, hubs, etc.) handled by Manager directly
    → Hub-owned routes resolved via verser2 redirect resolver → STH routeDomain
    → Topic/audit/log streams multiplexed across connected STHs
    → Storage paths translated to legacy v1 S3 proxy

CPM Message Flow (STH → Manager):
  STHController.hookupStream() → StringStream from communicationChannel
    → hostMessageHandler dispatches by CPMMessageCode (LOAD, SEQUENCE, INSTANCE, TOPIC, EVENT)
```

## Integration Points
- **`@scramjet/api-server`**: Cero-based router for all HTTP API endpoints.
- **`@scramjet/api-router`**: Route contracts, binding, and HTTP adapter for v2 API registration (v1 compatibility routes too).
- **`@scramjet/rest-api2`**: V2 route sets and schemas for Space-owned and Hub-owned routes.
- **`@signicode/verser2-guest-node` / `@signicode/verser-common`**: Verser2 broker/guest transport for STH communication.
- **`@scramjet/types`**: Interfaces for STH controllers, connection stores, info registers, service discovery, API REST types, and CPM message types.
- **`@scramjet/symbols`**: Shared enum constants.
- **`@scramjet/api-client` / `@scramjet/client-utils`**: `HostClient` used by `STHController`.
- **`@scramjet/obj-logger`**: Structured logging.
- **`@scramjet/model`**: `IDProvider`.
- **`@scramjet/load-check`**: OS resource load checking.
- **`@scramjet/adapter-process`**: Sequence package identification.
- **`minio`**: S3-compatible client.
- **`rereadable-stream`**: Re-readable buffers for multi-consumer output streams.
- **`scramjet`**: DataStream/StringStream for stream processing.

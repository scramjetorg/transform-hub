# @scramjet/manager Package

## Responsibility
The Manager is the central orchestrator in a Scramjet Transform Hub cluster. It manages STH (Scramjet Transform Hub) node connections, routes API requests to connected hosts, maintains a global registry of sequences/instances/topics across all connected STHs, provides a REST API for cluster-wide operations, and optionally proxies uploaded sequences to S3-compatible storage or local disk.

## Design / Patterns
- **STH (Host) Connection Management**: Each connected STH is wrapped in an `STHController` instance; the `SthConnectionStore` holds the active map of controllers by ID. The Manager supports transparent STH reconnection and id-based deduplication.
- **API Routing via Cero**: The `@scramjet/api-server` Cero-based router is used for both Manager-level endpoints and STH request proxying (`/api/v1/sth/:id/*` routes proxied to the target STH via Verser connection).
- **Verser-based Transport**: Communication with each STH uses Verser (reverse HTTP tunnel) connections. `Verser2ManagerSthBrokerTransport` provides an alternative Verser2-based transport layer for routed request/response between Manager and STH.
- **Aggregated State**: `STHInfoRegister` maintains a three-level map: Host → Sequence → Instance Set. `ServiceDiscovery` manages topic-based pub/sub wiring across host and API actors. Both aggregate state across all connected STHs.
- **Storage Abstraction**: `s3-router.ts` selects between `S3Proxy` (Minio client) or `DiskProxy` (local filesystem) depending on config. Both share the same router-based API for sequence upload, retrieval, and deletion.
- **Health & Audit**: The `Manager` exposes a health endpoint (delegating to `HealthCheck`). `ManagerAuditor` collects audit streams from all connected STHs plus its own heartbeat, multiplexed into a single `ReReadable` output.
- **Event Bus Pattern**: The Manager is a typed event emitter that forwards STH-originated events (`SpaceEventMessageData`) to all other connected STHs — a lightweight cluster-wide event bus.

## Data & Control Flow
```
Startup:
  start-manager.ts → new Manager()
    → Manager constructor sets up:
        - Router (Cero)
        - SthConnectionStore, STHInfoRegister, ServiceDiscovery
        - CommonLogsPipe (aggregated log output)
        - LoadCheck
        - ManagerAuditor
        - S3 client or disk fallback (via getS3Router)
    → manager.main() → attachManagerAPIs() (register REST routes)
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

API Request Routing:
  HTTP request → Manager.router → /api/v1/sth/:id/*
    → Manager.handleRequestToSTH(req, res)
    → Forwards via VerserConnection.getAgent() (HTTP proxy)
    → STHController handles and responds

CPM Message Flow (STH → Manager):
  STHController.hookupStream() → StringStream from communicationChannel
    → hostMessageHandler dispatches by CPMMessageCode:
        LOAD → updates load stat + health timeout
        SEQUENCE/SEQUENCES → emits "sequence" event
        INSTANCE/INSTANCES → emits "instance" event
        TOPIC → emits "topic" event (→ ServiceDiscovery.register/unregister)
        EVENT → emits "event" event (→ broadcast to all other STHs)
        NETWORK_INFO → updates network interfaces

API → Manager endpoints:
  GET /api/v1/version, /config, /health, /log, /load, /load-stream
  GET /api/v1/list, /instances, /sequences, /all_sequences, /entities
  GET /api/v1/topics, /api/v1/sth/:id/info
  DELETE /api/v1/sth/:id (force disconnect)
  DELETE /api/v1/store (clear sequence store index)
  POST /api/v1/disconnect (disconnect by id, accessKey, or limit)
  GET/POST /api/v1/topic/:name (upstream/downstream topic streams)
  S3 proxy: /api/v1/s3/* (sequence upload/download/delete) — guarded by s3Client
```

## Integration Points
- **`@scramjet/api-server`**: Provides the Cero-based router for all HTTP API endpoints.
- **`@scramjet/verser` / `@signicode/verser2-guest-node`**: Reverse HTTP tunnel transport used to communicate with each STH node.
- **`@scramjet/types`**: Interfaces for `ISTHController`, `ISTHConnectionStore`, `ISTHInfoRegister`, `IServiceDiscovery`, API REST types, and CPM message types.
- **`@scramjet/symbols`**: Shared enum constants (`CPMMessageCode`, `InstanceStatus`, `SequenceMessageCode`, `OpRecordCode`, `DisconnectHubErrors`).
- **`@scramjet/api-client` / `@scramjet/client-utils`**: `HostClient` used by `STHController` for intra-host API calls.
- **`@scramjet/obj-logger`**: Structured logging with pipeable outputs (aggregated via `CommonLogsPipe`).
- **`@scramjet/manager-config`**: Default configuration for the Manager.
- **`@scramjet/model`**: `IDProvider` for generating unique sequence/host IDs.
- **`@scramjet/load-check`**: OS resource load checking.
- **`@scramjet/adapter-process`**: `augment()` provides the `ProcessSequenceAdapter` for identifying uploaded sequence packages.
- **`minio`**: S3-compatible client for external storage (optional; falls back to disk).
- **`rereadable-stream`**: Re-readable buffer used by `CommonLogsPipe` and `ManagerAuditor` for multi-consumer output streams.
- **`scramjet`**: DataStream/StringStream for stream processing pipelines (log parsing, topic data, audit streams).

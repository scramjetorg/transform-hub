# `lib/` — Core Manager Library

## Responsibility
All core business logic of the Manager: STH connection lifecycle, CPM protocol message handling, aggregated state (sequences, instances, topics), REST API routing (v1+v2), log/audit aggregation, storage routing, Verser-based transport abstraction, route classification, and verser2 trust export.

---

## Modules

### `manager.ts` — `Manager` class (745 lines)
Central orchestrator. Implements `IComponent`. Responsibilities:
- **REST API registration** (`attachManagerAPIs`): ~25 endpoints covering version, config, list, instances, sequences, entities, topics, health, logs, load, store management, STH info, STH proxy, and disconnect.
- **Delegates API to `ManagerAPIHandler`**: `manager-api.ts` composes v1 and v2 handlers.
- **STH connection handling** (`handleHostConnection`): Accepts incoming Verser connections, deduplicates by ID, creates `STHController`, registers in `SthConnectionStore`, attaches event handlers.
- **STH request proxying** (`handleRequestToSTH`): Forwards HTTP requests via Verser agent.
- **Event broadcast**: Forwards `SpaceEventMessageData` between STHs.
- **Topic stream handling**: Creates `TopicActor` instances for upstream/downstream API-driven topic streams.
- **Config**: Reads `build.info.json` and `package.json` at runtime.

### `sth-controller.ts` — `STHController` class (477 lines)
Implements `ISTHController`. Wraps a single STH connection over Verser. Key aspects:
- **Connection lifecycle**: `init()` → `reconnect(verserConnection)` → `main()` → `hookupStream()`.
- **CPM message dispatch**: Routes by `CPMMessageCode` — LOAD, NETWORK_INFO, SEQUENCE, INSTANCE, TOPIC, EVENT.
- **Health management**: Load-based timeout; `healthy` flag toggled by LOAD messages.
- **Audit stream**: GET to STH's `/api/v1/audit`, annotates entries with host ID.

### `sth-connection-store.ts` — `SthConnectionStore` class (75 lines)
Implements `ISTHConnectionStore`. In-memory `Map<string, ISTHController>`.

### `sth-info-register.ts` — `STHInfoRegister` class (201 lines)
Three-level hierarchical store: `HostId → SequenceId → Set<InstanceId>`.

### `service-discovery.ts` — `ServiceDiscovery` + `TopicActor` (372 lines)
Topic-based pub/sub actor wiring. `TopicActor` is a typed actor (PROVIDER/CONSUMER, HOST/API) with lazy-init stream connections.

### `common-logs-pipe.ts` — `CommonLogsPipe` (48 lines)
Aggregates STH log streams into `ReReadable`.

### `health-check.ts` — `HealthCheck` (20 lines)
Process uptime, listening status.

### `manager-auditor.ts` — `ManagerAuditor` (104 lines)
Multiplexes STH audit streams plus heartbeat into `ReReadable`.

### `s3-router.ts` — `getS3Router` factory (18 lines)
Returns `DiskProxy` or `S3Proxy`.

### `verser2-transport.ts` — `Verser2ManagerSthBrokerTransport` (253 lines)
Verser2 broker transport for domain-routed HTTP requests between Manager and STH. Handles duplicate route detection, route unavailability, and polling-based readiness.

### `verser2-trust-export.ts` — `getManagerVerser2TrustExport` (50 lines)
Reads CA certificate PEM, extracts fingerprint/expiry, returns trust export object for verser2 connectivity.

### `route-classifier.ts` — `classifyManagerRoute` (293 lines)
Pure-function route classifier that determines whether a Manager route is:
- **`manager-owned`**: Version, config, health, list, instances, sequences, entities, topics, load, store, disconnect — handled by Manager directly.
- **`follow`**: Routes that target a specific STH (topic, log, audit, instance, rpc, sequence, sequences, instances, entities, etc.) — forwarded via verser redirect.
- **`manager-multiplex`**: Log, audit, load-stream, topic — aggregated across all STHs.
- **`unsupported-bidirectional`**: Host platform, instance inout — duplex streams not supported via simple redirect.

Also provides `prepareManagerFollowForwarding()` for constructing redirect or direct-route-metadata targets.

### `api/` — V1 and V2 API Handlers
See [api/](api/codemap.md) for details on `ManagerAPIHandler`, `ManagerAPIV1Handler`, and `ManagerAPIV2Handler`.

### `storage-routers/` — Storage Backends
See [storage-routers/](storage-routers/codemap.md) for details on `DiskProxy` and `S3Proxy`.

### `utils.ts` (125 lines)
- `translateDeleteError`, `validateDisconnectRequest`, `translateDisconnectError`, `prepareDisconnectDroplist`.

# `lib/` — Core Manager Library

## Responsibility
All core business logic of the Manager: STH connection lifecycle (with description/tags/accessKey metadata), CPM protocol message handling, aggregated state (sequences, instances, topics with hubId/location enrichment), REST API routing (v1+v2), log/audit aggregation, storage routing (S3/disk), Verser2 broker transport abstraction, route classification (with redirect/direct-route-metadata/unsupported-bidirectional decisions), verser2 trust export, and hub inventory tracking.

---

## Modules

### `manager.ts` — `Manager` class (801 lines)
Central orchestrator. Implements `IComponent`. Key additions:
- **Hub inventory tracking**: `hubInventoryState` Map tracks per-hub `sequencesReceived`/`instancesReceived` flags for aggregation readiness.
- **V2 Health Check**: `getV2HealthCheckInfo()` returns `RestAPI2.HealthCheckInfo<RestAPI2.Space>` with hub-by-hub breakdown, aggregation readiness, and health components via `createDefaultHealthComponents()`/`summarizeHealth()`.
- **STH registration with metadata**: `handleSthRegistration()` accepts `SthRegistrationPayload` with `id`, `routeDomain`, `enrollmentToken`, `accessKey`, `description`, `tags`. Validates enrollment token, deduplicates IDs, supports re-registration with rollback.
- **Route classification**: `handleRequestToSTH()` uses `classifyManagerRoute()` and routes via `handleClassifiedFollowRequestToSTH()` with redirect vs direct-route-metadata dispatch.
- **Public config masking**: `maskManagerConfig()` redacts S3 and verser2 secrets.
- **REST API**: `attachManagerAPIs()` delegates to `ManagerAPIHandler`. `setupHealthEndpoint()` registers v1 health route.
- **Store/index access**: Exposes `apiS3Middleware`, `apiSthConnectionStore`, `apiServiceDiscovery`, `apiCommonLogsPipe`, `apiLoadCheck`, `apiHealthCheck` getters.

### `sth-controller.ts` — `STHController` class (460 lines)
Implements `ISTHController`. Wraps a single STH connection over Verser2. Key aspects:
- **Connection lifecycle**: `init()` → `reconnect(verserConnection)` → `main()` → `hookupStream()`.
- **Metadata**: Supports `description`, `tags`, `accessKey` from verser2 options. Exposes `info` (created/lastConnected/lastDisconnected timestamps) and `infoForAPI` (ISO string variants).
- **CPM message dispatch**: Routes by `CPMMessageCode` — LOAD (triggers health timeout), NETWORK_INFO, SEQUENCE, INSTANCE, TOPIC, EVENT. Emits typed events for Manager consumption.
- **Health management**: Load-based timeout via `startLoadTimeout()`/`handleLoadTimeout()`; `healthy` flag toggled by LOAD messages.
- **Audit stream**: `getAuditStream()` makes CPM-internal request to STH's `/api/v1/audit`, annotates entries with host ID.
- **Topic requests**: `createUpstreamTopicRequest()` / `createDownstreamTopicRequest()` via verser2 broker.
- **Disconnect**: `disconnect(reason)` sends CPM code (KEY_REVOKED, LIMIT_EXCEEDED, ID_DROP) over verser2.

### `sth-connection-store.ts` — `SthConnectionStore` class (81 lines)
Implements `ISTHConnectionStore`. In-memory `Map<string, ISTHController>`. Adds `delete(id, force)` method that prevents native hub deletion and optionally forces disconnect.

### `sth-info-register.ts` — `STHInfoRegister` class (227 lines)
Three-level hierarchical store: `HostId → SequenceId → Set<InstanceId>`. Enriches instances with `hubId`, `location`, `sequenceId`, and `sequence.name` via `withAggregationMetadata()`. Supports `clearHostEntities()` and `handleHubDisconnect()`.

### `service-discovery.ts` — `ServiceDiscovery` + `TopicActor` (392 lines)
Topic-based pub/sub actor wiring. `TopicActor` is a typed actor (PROVIDER/CONSUMER, HOST/API) with lazy-init stream connections over verser2. `ServiceDiscovery` manages topic lifecycle, connects provider/consumer streams, and skips host-to-host pairs (data-plane bypass).

### `common-logs-pipe.ts` — `CommonLogsPipe` (53 lines)
Aggregates STH log streams into `ReReadable` with host ID prefix. Supports `addInStream()`/`removeInStream()` per host ID.

### `health-check.ts` — `HealthCheck` (20 lines)
Process uptime, listening status from the `net.Server`.

### `manager-auditor.ts` — `ManagerAuditor` (106 lines)
Multiplexes STH audit streams plus heartbeat into `ReReadable`. Supports `setFlowing()` state, dynamically attaches/detaches STH audit streams. Uses `MultiStream` for muxing.

### `s3-router.ts` — `getS3Router` factory (18 lines)
Returns `DiskProxy` or `S3Proxy` based on Minio client availability.

### `verser2-transport.ts` — `Verser2ManagerSthBrokerTransport` (255 lines)
Verser2 broker transport for domain-routed HTTP requests between Manager and STH. Handles duplicate route detection, route unavailability, polling-based readiness, AbortSignal support, and route signature suppression during close.

### `verser2-trust-export.ts` — `getManagerVerser2TrustExport` (50 lines)
Reads CA certificate PEM, extracts fingerprint/expiry via `X509Certificate`, returns trust export object with host URL and route domains.

### `route-classifier.ts` — `classifyManagerRoute` (293 lines)
Pure-function route classifier that determines whether a Manager route is:
- **`manager-owned`**: Version, config, health, list, instances, sequences, entities, topics, load, store, disconnect, sth-registry, sth-info, sth-disconnect — handled by Manager directly.
- **`follow`**: Routes targeting a specific STH — forwarded via verser2 redirect or direct-route-metadata (when `cpm: true` header).
- **`manager-multiplex`**: Log, audit, load-stream, topic — aggregated across all STHs.
- **`unsupported-bidirectional`**: Host platform, instance inout — duplex streams not supported via simple redirect.

Also provides `prepareManagerFollowForwarding()` for constructing redirect (HTTP 308 with location/routeDomain/targetPath headers) or direct-route-metadata (409 JSON response) targets.

### `api/` — V1 and V2 API Handlers
See [api/](api/codemap.md) for details on `ManagerAPIHandler`, `ManagerAPIV1Handler` (219 lines), and `ManagerAPIV2Handler` (375 lines).

### `storage-routers/` — Storage Backends
See [storage-routers/](storage-routers/codemap.md) for details on `DiskProxy` and `S3Proxy`.

### `utils.ts` (124 lines)
- `translateDeleteError`, `validateDisconnectRequest`, `translateDisconnectError`, `prepareDisconnectDroplist` — hub disconnect lifecycle helpers.

# `lib/` — Core Manager Library

## Responsibility
All core business logic of the Manager: STH connection lifecycle, CPM protocol message handling, aggregated state (sequences, instances, topics), REST API routing, log/audit aggregation, storage routing, and Verser-based transport abstraction.

---

## Modules

### `manager.ts` — `Manager` class (745 lines)
Central orchestrator. Implements `IComponent`. Responsibilities:
- **REST API registration** (`attachManagerAPIs`): ~25 endpoints covering version, config, list, instances, sequences, entities, topics, health, logs, load, store management, STH info, STH proxy, and disconnect.
- **STH connection handling** (`handleHostConnection`): Accepts incoming Verser connections, deduplicates by ID (supports reconnection), creates `STHController`, registers in `SthConnectionStore`, attaches event handlers for sequences/instances/topics/events.
- **STH request proxying** (`handleRequestToSTH`): Forwards HTTP requests to the correct STH via Verser agent (HTTP proxy pattern). Handles 100-continue, error disconnect, socket abort.
- **Event broadcast**: Forwards `SpaceEventMessageData` from one STH to all other connected STHs.
- **Topic stream handling**: Creates `TopicActor` instances for upstream (consumer) and downstream (provider) API-driven topic streams, registered via `ServiceDiscovery`.
- **Config**: Reads `build.info.json` and `package.json` at runtime for version/build info.
- **Initialization**: `main()` creates `/tmp/manager/:id/`, attaches APIs, resolves the `startedPromise`.

### `sth-controller.ts` — `STHController` class (477 lines)
Implements `ISTHController`. Wraps a single STH connection over Verser. Key aspects:
- **Connection lifecycle**: `init()` → `reconnect(verserConnection)` → `main()` → `hookupStream()`. Sets up the `/api/v1/platform` duplex channel for CPM messages and `/api/v1/log` stream.
- **CPM message dispatch** (`hostMessageHandler`): Routes messages by `CPMMessageCode` — LOAD (health), NETWORK_INFO, SEQUENCE, SEQUENCES, INSTANCE, INSTANCES, TOPIC, EVENT. Emits typed events for each.
- **Health management**: `startLoadTimeout()` sets a timeout; if no LOAD message arrives before expiry, `healthy` becomes false. `reconnect()` resets health.
- **Audit stream**: `getAuditStream()` makes a GET to the STH's `/api/v1/audit` and returns a `StringStream` that annotates entries with the host ID.
- **Disconnect**: `disconnect(reason)` sends a CPM disconnect code (KEY_REVOKED, LIMIT_EXCEEDED, ID_DROP) over the communication stream, then closes the Verser connection.
- **Access key**: Extracted from Verser connection header `x-self-hosted`.
- **Topic requests**: `createUpstreamTopicRequest` / `createDownstreamTopicRequest` make Verser-routed requests to the STH's topic endpoints.

### `sth-connection-store.ts` — `SthConnectionStore` class (75 lines)
Implements `ISTHConnectionStore`. In-memory `Map<string, ISTHController>`. Provides:
- `list()`, `forEach()`, `map()` — iteration over controllers.
- `add(controller)` — insert by controller.id.
- `getById(id)`, `getByAccessKey(key)` — lookup.
- `getSTHControllersInfo()` — map to REST response type.
- `delete(id, force)` — guarded removal (rejects native hubs, checks connected state).

### `sth-info-register.ts` — `STHInfoRegister` class (201 lines)
Implements `ISTHInfoRegister`. Three-level hierarchical store: `HostId → SequenceId → Set<InstanceId>`. Also maintains side arrays `sequencesStore` and `instancesStore` for aggregate queries. Provides:
- `addHub`, `addSequence`, `deleteSequence`, `addInstance`, `deleteInstance` — mutation operations with duplicate/absence guards.
- `getHubs`, `getSequences`, `getSequencesByHub`, `getInstances`, `getInstancesByHub` — query methods.
- `clearHostEntities(id)` — removes all instances/sequences for a disconnected host but preserves the hub entry.
- `handleHubDisconnect(id)` — delegates to `clearHostEntities`.

### `service-discovery.ts` — `ServiceDiscovery` + `TopicActor` (372 lines)
- **`TopicActor`**: A typed actor that can be a PROVIDER or CONSUMER, of type HOST or API. Holds a stream reference. Provides `connectoTo(targetActor)` which establishes a pipe between provider and consumer streams (lazy-init for host actors via Verser requests).
- **`ServiceDiscovery`**: Manages a `Map<string, Topic>`. Key methods:
  - `register(actor, opts)`: Adds actor to a topic; if topic doesn't exist, creates it. Emits `onTopicUpdate`.
  - `unregister(actor)`: Sets `retired = true`, triggers update.
  - `onTopicUpdateWorker`: Filters retired actors; connects unmatched providers to consumers via `connectoTo`. If no actors remain, deletes the topic.
  - `list()`: Returns topic info for the REST API.
  - Update loop is batch-coalesced (`updatedTopics` Set + `topicUpdateRunning` guard) to avoid concurrent runs.

### `common-logs-pipe.ts` — `CommonLogsPipe` (48 lines)
Aggregates multiple STH log streams into a single `ReReadable` output. Each incoming stream is prefixed with the host ID and suffixed with newline. Uses `ReReadable` so multiple consumers can read from the beginning.

### `health-check.ts` — `HealthCheck` (20 lines)
Simple class that provides `getHealthCheckInfo()` returning process uptime, timestamp, and whether the STH server socket is listening.

### `manager-auditor.ts` — `ManagerAuditor` (104 lines)
Multiplexes audit data from all connected STHs plus a self-heartbeat stream into a single `ReReadable` output. When `flowing` is true, it attaches each STH's audit stream via `MultiStream`. The heartbeat writes `OpRecordCode.MANAGER_HEARTBEAT` every 5 seconds.

### `s3-router.ts` — `getS3Router` factory (18 lines)
Returns `DiskProxy` if no `s3Client` is provided, or `S3Proxy` if a Minio client is available.

### `verser2-transport.ts` — ManagerSthBrokerTransport (253 lines)
- **`Verser2ManagerSthBrokerTransport`**: Wraps a Verser2 broker, providing `connect`, `close`, `getRoutes`, `isRouteReady`, `waitForRoute`, and `request`. Used for domain-routed HTTP-like requests between Manager and STH nodes.
- Handles duplicate route detection (`Verser2DuplicateRouteError`), route unavailability (`Verser2RouteUnavailableError`), closed-transport suppression, and polling-based route readiness with optional timeout.
- Factory functions: `createManagerSthBrokerTransport(options)` and `createManagerSthLocalBrokerTransport(broker)`.

### `utils.ts` (125 lines)
Three exported helper functions:
- `translateDeleteError(e)`: Maps `SthConnectionStoreErrors` to HTTP status codes and messages.
- `validateDisconnectRequest(payload, store)`: Validates disconnect payload structure (id, accessKey presence, hub type, connected state).
- `translateDisconnectError(error)`: Maps `DisconnectHubErrors` enum to HTTP responses.
- `prepareDisconnectDroplist(payload, store)`: Builds a list of `{sthController, reason}` tuples filtered by the disconnect criteria (id, accessKey, limit).

# packages/host/src/lib/

## Responsibility

Core host runtime library for API orchestration (v1 + v2), sequence and instance state, verser2 runner transport, control-plane integrations, and host identity management.

This layer is the runtime heart of a Host node: it boots runtime adapters, exposes endpoints/events (both v1 and v2 REST), tracks local sequence/instance lifecycles, bridges to platform services, and manages stable host identity.

## Directory Map

| Directory | Responsibility |
|-----------|---------------|
| `api/` | V1 and V2 REST API handlers (`HostAPIV1Handler`, `HostAPIV2Handler`, `InstanceAPI`, `InstanceAPIV2`) |
| `types/` | TypeScript interfaces (`IHost`, `ICSI`, store types) |
| `handlers/` | Audit stream handler |
| `middlewares/` | Audit logging middleware |
| `serviceDiscovery/` | Topic-based pub/sub (topic router, topic IDs, content-type validation, SD adapter) |
| `local-storage/` | Local filesystem store adapters and utilities |

## Key Modules

### `host-id.ts` — Stable Host Identity Resolution

Derives and persists a stable host identifier. `resolveStableHostId()` checks three sources in priority order:
1. Configured `host.id` from CLI/config — returned as-is if provided.
2. On-disk JSON file (`host.infoFilePath`) — reads the `id` field if present.
3. Auto-generated UUID via `IDProvider.generate()` — written to the info file for future runs.

`writeHostInfoFile()` and `readHostInfoFile()` manage the JSON info file lifecycle (mkdir, write, read, parse). Used by `Host.getId()`, `Host.writeInfoFile()`, `Host.readInfoFile()`, and consumed by `CPMConnector` for registration and runner verser2 identity derivation.

### `runner-verser2-host-config.ts` — Runner Verser2 Host Config & Identity

Manages STH-local runner verser2 Host TLS identity lifecycle:
- `resolveSthRunnerVerser2HostConfig()`: If explicit cert/key is not configured, auto-generates a CA + server certificate via `selfsigned` into `identityDir`.
- `deriveSthRunnerVerser2HostIdentity()`: Resolves the `"auto"` broker peerId to `sth.<hostId>.runner.broker` when a host ID is available; logs a warning for the legacy unsafe default (`sth.default.runner.broker`) via `checkSthRunnerVerser2LegacyBrokerPeerId()`.
- `createSthRunnerVerser2HostOptions()`: Builds `VerserHostOptions` from resolved config.
- `ensureGeneratedSthRunnerVerser2HostIdentity()`: Orchestrates self-signed certificate generation with SANs derived from `publicUrl` and `bindHost`.

### `runner-verser2-host-peers.ts` — Runner Verser2 Local Peers

Creates the STH-local verser2 Host's local broker and guest peer attachments. `attachSthLocalRunnerVerser2Peers()` wires the broker transport (`createVerser2RunnerBrokerTransport`) and guest listener (API server request forwarding). `getRunnerVerser2HostUpstreamParams()` determines whether/when to connect the local Host upstream to the Manager.

### `runner-transport.ts` — Runner Verser2 Transport

Defines `Verser2RunnerBroker` interface and `createVerser2RunnerBrokerTransport()` factory for verser2-routed runner orchestration. Provides `waitForRoute()`, `request()`, and route tracking for runner communication over the verser2 transport layer.

### `rpc-path.ts` — RPC Path Utilities

`normalizeRpcForwardPath()`, `matchesRpcExposePath()`, and `stripRpcExposePath()` for RPC path handling across v1/v2 API versions.

### `utils.ts` — `mapRunnerExitCode()`

Maps numeric runner exit codes to structured status/message results. Distinguishes `STOPPED` (completed), `KILLED`, `SEQUENCE_FAILED_*`, `INVALID_ENV_VARS`, `PODS_LIMIT_REACHED`, and other exit scenarios.

### `start-host.ts` — `startHost()` Entrypoint

Thin factory: `startHost()` creates an `APIExpose` server via `createServer()`, instantiates `Host`, and calls `host.main()`.

### `cpm-connector.ts` — CPM Manager Connectivity & Reconnect Supervisor

`CPMConnector` manages the Host's connection to the Manager/CPM over verser2 broker+guest. The reconnection design was hardened with the following mechanisms:

#### Single Reconnect Supervisor (`reconnectPromise`)
- A single shared async loop (`reconnectPromise`) replaces the old recursive `reconnect()` model. Close events, communication-stream errors, and failed registration notifications all share this loop instead of starting competing connection attempts.
- The supervisor loops `while (!this.isAbandoned)`, calling `connectOnce()` after each backoff delay. Success exits the loop; failure continues until abandoned.
- On exit (success, failure, or cancellation) the supervisor resets `isReconnecting`, clears `reconnectPromise`, and cancels any pending backoff, making the connector restartable for a future Manager restart.

#### Generation Protection (`communicationGeneration`, `registrationAttemptGeneration`)
- `communicationGeneration` — a monotonically increasing counter incremented each time `handleCommunicationRequest()` accepts a new Manager communication duplex. All stream close/error callbacks capture the generation at subscription time; `handleConnectionClose()` rejects stale calls where `generation !== this.communicationGeneration`, preventing an old dead stream from disconnecting its live replacement.
- `registrationAttemptGeneration` — incremented in `handleConnectionClose()` before returning. The `connectOnce()` method captures `regAttemptGeneration` before `registerWithManager()`. If the stream was closed while registration was in-flight, the mismatch is detected after registration returns, the stale result is discarded with `throw new Error("Registration invalidated by stream close")`, and the reconnect supervisor retries.

#### Cancellation / Abandonment (`isAbandoned`, `abandonReconnect()`)
- `isAbandoned` is the terminal flag. Once set (via `disconnect()`, `KEY_REVOKED`/`LIMIT_EXCEEDED`/`ID_DROP` messages, or a 403 close), all entrypoints (`connect()`, `connectOnce()`, `reconnect()`, `handleConnectionClose()`) are no-ops.
- `abandonReconnect()` cancels any pending backoff delay and clears `isReconnecting` without setting `isAbandoned`. Used in `disconnect()` (which also sets `isAbandoned`) and drop-message handlers (already setting `isAbandoned`).
- `disconnect()` sets `isAbandoned`, calls `abandonReconnect()`, ends the communication stream, revokes the verser2 guest route, and closes the verser2 broker/guest.

#### Transport-Neutral Exponential Backoff (`ExponentialBackoff`)
- Lazily created by `ensureReconnectBackoff()` using `createExponentialBackoff()` from `@scramjet/utility`.
- `initialDelay` is derived from `config.reconnectionDelay` (default 0).
- `maxDelay` is either `config.reconnectionMaxDelay` (if set and >= initialDelay) or `initialDelay * maxReconnections` as a legacy compatibility multiplier.
- `ExponentialBackoff.success()` is called after a successful connection, resetting the wait to `initialDelay`.
- A custom `BackoffTimer` can be injected via `config.reconnectionTimer` for deterministic testing; defaults to `setTimeout`/`clearTimeout`.
- Backoff is cancellable per-delay via `BackoffPromise.cancel()` or globally via `ExponentialBackoff.cancel()`.

### `host.ts` — Inventory Replay on Reconnection

The `Host.connectToCPM()` method installs a `communicationReady` listener (gated by `cpmInventoryListenerInstalled` to ensure exactly one listener) that replays the full Host inventory snapshot every time a new communication stream is established:

1. **Sequences**: `connector.sendSequencesInfo(getSequences())` — all local sequences with `SEQUENCE_CREATED` status.
2. **Instances**: `connector.sendInstancesInfo(getInstances())` — all local instances.
3. **Topics**: `connector.sendTopicsInfo(getTopics())` — all local topics.
4. **HTTP Agent**: `s3Client?.setAgent(connector.getHttpAgent())` — updates the S3 client for Manager-backed storage.

This ensures that after every reconnection (triggered by `handleCommunicationRequest` → `communicationReady`), the Manager receives a complete, current view of the Host's state. Stale entities from the previous session are implicitly replaced when the Manager processes the new inventory.

## Design/Patterns

- **Central `Host` class**: Coordinates immutable config, event bus, logging, telemetry, and async lifecycle.
- **Controller/dispatcher split**:
  - `CSIController` handles persisted instance lifecycle operations and status transitions.
  - `CSIDispatcher` schedules dispatch/monitoring against a runtime adapter.
- **Store abstractions** (`SequenceStore`, `InstanceStore`): Persist and synchronize objects.
- **verser2-driven runner control plane**: Explicit channel handlers for runner transport (`runner-transport.ts`, `runner-verser2-host-config.ts`, `runner-verser2-host-peers.ts`).
- **Observer/connector pattern**: `CPMConnector` drives external platform events and host registration.
- **Host identity management**: `host-id.ts` provides three-tier stable ID resolution (explicit → persisted → generated), consumed by CPM registration and runner verser2 identity derivation.
- **Self-signed TLS identity**: `runner-verser2-host-config.ts` auto-generates CA + server certificates when explicit TLS is not configured, with hostname/IP SANs.
- **V1 + V2 API**: `HostAPIHandler` composes `HostAPIV1Handler` (legacy Cero handlers) and `HostAPIV2Handler` (v2 contracts via `@scramjet/api-router`). `/api` directory holds both.

## Data & Control Flow

- `Host.main()` sequence:
   1. initialize telemetry/logging + API request logging,
   2. optionally identify existing sequences,
   3. `initializeRuntimeAdapters(...)`,
   4. initialize local storage and runner verser2 Host when enabled,
       - resolves host identity via `host-id.ts` (`this.config.host.id ||= this.getId()`),
       - derives runner verser2 broker peerId from host ID if set to `"auto"`,
       - resolves/generates TLS identity for the STH-local runner verser2 Host,
       - creates `VerserHost`, starts it, attaches local broker + guest peers,
       - optionally connects the local Host upstream to the Manager's verser2 Host.
   5. attach listeners/handlers and start listening on host API,
   6. connect to CPM (if configured), then run startup sequences.
- Incoming run requests pass through REST handlers into `CSIController`/`CSIDispatcher`, which resolves sequence package via store, provisions runner verser2 routing, and delegates execution to adapter.
- Runtime completion or failures flow back through event bus, persisted instance state, audit logs, and optional platform connectors.
- `performStop` and `stop` perform graceful shutdown of servers, in-flight instances, and cleanup hooks.

## Integration Points

- Integrates with runtime adapters from `@scramjet/runner` through adapter initialization.
- Depends on `serviceDiscovery/sd-adapter.ts` for topic registration and space service announcements.
- Connects optional CPM platform using `cpm-connector.ts` and host identification APIs via `host-id.ts`.
- `host-id.ts` provides stable identity consumed by `CPMConnector`, `runner-verser2-host-config.ts` (broker peerId derivation), and process-level identification.
- Writes/reads files via `sequence-store.ts`, `instance-store.ts`, `s3-client.ts`, and `host-id.ts` (host info JSON file).
- Uses `auditor.ts` and `common-logs-pipe.ts` for compliance/audit and log routing.
- `start-host.ts` is the entrypoint consumed by `packages/sth/src/bin/hub.ts` and `packages/sth/src/index.ts`.
- V2 API depends on `@scramjet/api-router` and `@scramjet/rest-api2`.

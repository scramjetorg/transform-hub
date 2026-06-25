# Type Ownership Inventory for `@scramjet/types` Split

**Track**: `typings_split_appcontext_20260622`
**Date**: 2026-06-24
**Target packages**: `@scramjet/runtime-types`, `@scramjet/sequence-types`, `@scramjet/api-types`

---

## 1. Executive Summary

The `@scramjet/types` package currently exports from **58 source modules** (counting each `export * from` / namespace / selective export unit as one module). After full inspection, the non-overlapping ownership classification is:

| Destination               | Count | Description                                                        |
|---------------------------|-------|--------------------------------------------------------------------|
| `@scramjet/runtime-types` | 14    | Runtime-neutral core types (config, logger, errors, stream plumbing, lifecycle contracts, utils, transport). Note: `functions` is dual-classified (shared with sequence-types as frozen API re-export). `runner` (FunctionStatus subset) and `runtime-adapter` overlap with shared-exception. |
| `@scramjet/sequence-types`| 3     | Sequence-author-facing API (AppContext, Application, Sequence as frozen API). Re-exports `functions` from runtime-types. |
| `@scramjet/api-types`     | 35    | API/CLI/user contract types (REST DTOs, messages, configuration, client utils, connectors). Includes 5 namespace/selective exports (rest-api-*, sd-stream-handler). |
| **local-only**            | 3     | Types bound to owning implementation packages (lifecycle-adapters → adapters, runtime-executor → runner, csh-connector → runner) |
| **shared-exception**      | 3     | Protocol contracts that must remain shared (sequence-adapter/SequenceInfo, runtime-adapter, runner.ts message tuples). These overlap with runtime-types classification. |
| not exported              | 3     | Internal files (`runner-update.ts`, `model.ts`, `rest-api-commons/`) |

**Key findings**:
- `app-context.ts` and `application.ts` are the primary sequence-types candidates — they define the `AppContext` interface and `Application` function shapes that sequence authors program against.
- `error-codes/` bundles both generic (`AppError`) and adapter-specific codes; splitting is not recommended since `AppErrorCode` is a union of all sub-codes.
- `runner.ts` has mixed concerns: `FunctionStatus` is runtime, but `RunnerMessage`/`CPMMessage` are protocol tuples.
- `instance.ts`, `instance-limits.ts`, `instance-stats.ts`, `instance-store.ts` are closely coupled API types used together.

---

## 2. AppContext Inline API Client Dependencies (Critical Split Decision)

The current `AppContext` interface (in `packages/types/src/app-context.ts`) carries concrete dependencies on three API client types that must be broken for the split:

| Dependency | Import source | Used by AppContext member | Impact on split |
|---|---|---|---|
| `APIExpose` | `./api-expose` | `AppContext.api: APIExpose` | The `api` property references `APIExpose` (HTTP server route registration). A minimal `BaseAppContext` must either drop this member, make it generic, or inline a minimal route-registration interface. |
| `HostClient` | `./api-client/host-client` | `AppContext<..., HubClientType, ...>` (default generic parameter) | The third generic parameter defaults to `HostClient`. A runtime-neutral `BaseAppContext` should use an opaque `HubClientType` parameter without defaulting to a concrete HTTP client. |
| `ManagerClient` | `./api-client/manager-client` | `AppContext<..., ..., SpaceClientType>` (default generic parameter) | The fourth generic parameter defaults to `ManagerClient`. Same issue: `BaseAppContext` should not commit to a concrete REST client shape. |

**Decision required for Phase 2**: The sequence-facing `BaseAppContext` in `@scramjet/runtime-types` should define a minimal surface that does NOT import `APIExpose`, `HostClient`, or `ManagerClient`. The options are:

1. **Drop `api` from BaseAppContext** — move `api.use()` to a sequence-types extension or make it optional via a union/never type.
2. **Make `api` a generic property** — `BaseAppContext` provides a generic `api: APIExposeType` parameter that resolves to `never` or a minimal stub in the base, and only `@scramjet/sequence-types` or `@scramjet/api-types` fills in the concrete `APIExpose`.
3. **Inline a minimal route-registration interface** in `runtime-types` that contains only `use(path, handler)` without the full HTTP server types from `./api-expose`.
4. **Use opaque client type parameters** — `BaseAppContext<C, S>` omits the hub/space client generics and adds them only in `@scramjet/sequence-types`/`@scramjet/api-types` extensions.

**Recommendation**: Option 4 (opaque params) for client types, Option 3 (minimal inlined route interface) for `api`, to keep `BaseAppContext` dependency-free while preserving the sequence-author API surface in `@scramjet/sequence-types`.

### 2.1 `app-context.ts` current imports (lines to break)

```
import type { APIExpose, APIRoute, ForwardStrategy, Middleware, ParsedMessage, StreamConfig } from "./api-expose";
import type { HostClient } from "./api-client/host-client";
import type { ManagerClient } from "./api-client/manager-client";
```

These three imports must be replaced or abstracted in `runtime-types`/`sequence-types`. The `api-expose` dependency is the most impactful because it pulls in HTTP server types (`APIRoute`, `ForwardStrategy`, `Middleware`, `ParsedMessage`, `StreamConfig`) that `BaseAppContext` should never reference.

---

## 3. Detailed Type Inventory Table

### 3.1 `@scramjet/runtime-types` — Generic runtime-neutral core

| # | Source module | Key exports | Rationale |
|---|---|---|---|
| 1 | `./app-config` | `AppConfig` | Generic recursive config shape; no platform dependency |
| 2 | `./error-codes` | `AppError`, `AppErrorCode`, `AppErrorConstructor`, `HostErrorCode`, `RunnerErrorCode`, `InstanceAdapterErrorCode`, `CSIControllerErrorCode`, `SequenceAdapterErrorCode` | Error types are foundational; `AppError` used by `AppContext`; subtypes are string literal unions in the `AppErrorCode` mega-union — safe to keep together |
| 3 | `./component` | `IComponent` | Minimal base interface (logger + id); runtime-neutral |
| 4 | `./functions` | `ReadFunction`, `WriteFunction`, `TranformFunction`, `RFunction`, `TFunction`, `WFunction`, `TFunctionChain` | Stream function primitives; consumed by both runtime internals and sequence types; no sequence-specific dependency |
| 5 | `./logger` | `LoggerOutput`, `LoggerOptions`, `Logger` | Simple console logger shape; runtime-neutral |
| 6 | `./lifecycle` | `ILifeCycleAdapter` | Base lifecycle adapter contract (init, identify, run, cleanup); generic contract (contrast with `lifecycle-adapters.ts` which is the concrete adapter API) |
| 7 | `./local-storage` | `StorageAdapterType`, `ILocalStorage` | KV storage abstraction; referenced by `AppContext` |
| 8 | `./message-streams` | `DownstreamStreamsConfig`, `UpstreamStreamsConfig`, `PassThroughStreamsConfig`, `EncodedMessage`, `MessageType`, `MessageDataType`, `ControlMessageCode`, `MonitoringMessageCode` | Stream plumbing configs for inter-process data flow; purely about message framing, not message content |
| 9 | `./object-logger` | `LogLevel`, `LogEntry`, `IObjectLogger`, `IObjectLoggerOptions` | Structured logger interface; runtime-neutral |
| 10 | `./op-response` | `OpResponse` | Generic operation response type; no platform dependency |
| 11 | `./runner-config` | `CommonSequenceConfig`, `SequenceConfig`, `InstanceConfig`, `DockerSequenceConfig`, `ProcessSequenceConfig`, `KubernetesSequenceConfig` | Runner/instance configuration shapes; runtime-neutral |
| 12 | `./runner-connect` | `RunnerConnectInfo` | Runner startup payload; runtime-neutral |
| 13 | `./runner-transport` | `RunnerTransportKind`, `RunnerTransportRouteContracts`, `RunnerTransport`, `DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS` | Transport layer contracts; used by runner ↔ host communication |
| 14 | `./runner` | `FunctionStatus`, `MessageCodes.*`, `RunnerOptions`, `RunnerMessage`, `CPMMessage` | `FunctionStatus` is runtime type; `RunnerMessage`/`CPMMessage` are protocol tuples — kept here as they describe runner framing |
| 15 | `./utils` | `MaybePromise`, `Streamable`, `ReadableStream`, `WritableStream`, `DuplexStream`, `PassThoughStream`, `Gen`, `AsyncGen`, `PipeableStream`, `StreambleMaybeFunction`, `DeepPartial`, `IdString`, `UrlPath`, `Port`, `ApiVersion`, `Validator`, `ValidationSchema`, `ValidationResult` | Foundational utility types; used by every layer |
| 16 | `./runtime-adapter` | `RuntimeOptionDescriptor`, `RuntimeOptionRegistry`, `IAdapterAugmentation`, `AdapterInitializeFunction`, `AdapterAugmentOptionsFunction`, `AdapterAugmentConfigFunction` | Generic runtime adapter registration contracts |

### 3.2 `@scramjet/sequence-types` — Sequence-author-facing API

| # | Source module | Key exports | Rationale |
|---|---|---|---|
| 1 | `./app-context` | `AppContext<AppConfigType, State, HubClientType, SpaceClientType>`, `StopHandler`, `KillHandler`, `MonitoringHandler` | **Primary sequence API** — the interface every sequence author programs against; defines the runtime contract exposed to user code |
| 2 | `./application` | `Application`, `TransformApp`, `ReadableApp`, `WritableApp`, `InertApp`, `ApplicationFunction`, `ApplicationInterface`, `ApplicationExpose` | **Sequence author function shapes** — the typed function signatures users write their sequences with |
| 3 | `./functions` | `ReadFunction`, `WriteFunction`, `TranformFunction`, `RFunction`, `TFunction`, `WFunction`, `TFunctionChain` | **Dual classification**: kept in runtime-types for the canonical copy; sequence-types would re-export from runtime-types as frozen API |
| 4 | `./sequence` | `InertSequence`, `WriteSequence`, `ReadSequence`, `TransformSequence`, `TransformAppAcceptableSequence` | **Canonical sequence types** — the specific sequence shapes users compose from function types |

> **Note**: `./functions` is listed in both runtime-types and sequence-types (dual-classification) because functions.ts defines the fundamental stream processing primitives that are the building blocks for sequences. Under the split, runtime-types owns the canonical definitions; sequence-types re-exports them as a frozen/public API subset. This avoids duplication. The non-overlapping unique count for sequence-types is 3 unique modules.

### 3.3 `@scramjet/api-types` — API/CLI/user contract types

| # | Source module | Key exports | Rationale |
|---|---|---|---|
| 1 | `./api-expose` | `APIExpose`, `APIBase`, `APIRoute`, `APIServer`, `APIError`, `ParsedMessage`, `HttpMethod`, `StreamConfig`, `Middleware`, `Decorator`, `ListenArgs`, `IDuplexStream`, `ForwardStrategy`, `APIMethods` | HTTP server API types; part of the API layer |
| 2 | `./cpm-connector` | `CPMConnectorOptions` | CPM connector configuration; infrastructure/API layer |
| 3 | `./communication-handler` | `ICommunicationHandler`, `MonitoringMessageHandler`, `ControlMessageHandler` | IPC handler interface used by the API server and lifecycle |
| 4 | `./client-utils/index` | `QueryError`, `ClientError`, `ClientErrorCode`, `HttpClient`, `IHttpClient`, `ClientUtilsBase`, `ClientUtils`, `ClientUtilsCustomAgent`, `RequestLogger`, `RequestConfig`, `SendStreamOptions`, `IHeaders` | HTTP client utilities; part of the API client SDK |
| 5 | `./manager-configuration` | `ManagerConfiguration` | Manager process configuration |
| 6 | `./manager/index` | `IServiceDiscovery`, `ITopicActor`, `ActorType`, `ActorRole`, `Topic`, `ISTHController`, `ISTHConnectionStore`, `ISTHInfoRegister`, `STHControllerEvents`, `DisconnectReason`, `SthConnectionStoreErrors` | Manager infrastructure types (service discovery, connection store, info register) |
| 7 | `./messages/index` | `AcknowledgeMessage`, `KeepAliveMessage`, `KillSequenceMessage`, `MonitoringMessage`, `HandshakeMessage`, `ErrorMessage`, `StatusMessage`, `DescribeSequenceMessage`, `FunctionDefinition`, `MonitoringRateMessage`, `SequenceCompleteMessage`, `SequenceEndMessage`, `LoadCheckStatMessage`, `NetworkInfoMessage`, `STHIDMessageData`, `CPMMessageSTHID`, `InstanceBulkMessage`, `InstanceMessage`, `SequenceBulkMessage`, `SequenceMessage`, `SequenceStoppedMessageData`, `OpRecord`, `STHTopicEventData`, `EventMessageData`, `StorageMessageData`, `StorageUpdateMessageData`, `SpaceEventMessageData` | Protocol message data shapes; used as API contracts between runner/host/manager |
| 8 | `./monitoring-server` | `MonitoringServerConfig`, `IMonitoringServer`, `IMonitoringServerConf`, `IMonitoringServerConstructor`, `IMonitoringServerConfConstructor`, `IMonitoringServerOptions`, `MonitoringServerValidator` | Monitoring server configuration and interfaces |
| 9 | `./module-loader` | `ModuleLoaderOpts` | Module loader options |
| 10 | `./sth-configuration` | `STHConfiguration`, `PublicSTHConfiguration`, `AdapterConfig`, `HostConfig`, `ContainerConfiguration`, `DockerAdapterConfiguration`, `K8SAdapterConfiguration`, `PreRunnerContainerConfiguration`, `RunnerContainerConfiguration`, `CouchDbAdapterConf` | STH (Host) full configuration shape |
| 11 | `./load-check-stat` | `LoadCheckStat`, `DiskSpace`, `InstanceRequirements`, `LoadCheckRequirements`, `LoadCheckContstants` | System load/health check types |
| 12 | `./network-info` | `NetworkInfo` | Network interface information |
| 13 | `./instance-store` | `Instance` | Instance store data type |
| 14 | `./instance` | `InstanceId`, `InstanceArgs`, `InstanceConnectionInfo`, `StartInstanceReturnType` | Instance identity and startup types |
| 15 | `./instance-limits` | `InstanceLimits` | Resource limits for instances |
| 16 | `./instance-stats` | `InstanceStats` | Runtime instance statistics |
| 17 | `./sth-command-options` | `STHCommandOptions` | CLI command options for STH |
| 18 | `./telemetry-config` | `TelemetryConfig`, `TelemetryAdaptersConfig` | Telemetry configuration |
| 19 | `./verser2-transport-configuration` | `STHOutboundVerser2Config`, `ManagerVerser2Config`, `STHRunnerVerser2HostConfig`, `Verser2HostTlsConfig`, `Verser2ClientTlsConfig`, `Verser2TlsFilesConfig`, `Verser2TimeoutConfig`, `Verser2LeaseConfig` | Verser2 (WebRTC-like transport) configuration |
| 20 | `./host-proxy` | `HostProxy` | Host proxy interface |
| 21 | `./api-client/factory` | `ApiClientFactory` | API client factory type |
| 22 | `./api-client/host-client` | `HostClient`, `InstanceClient`, `SequenceClient`, `ClientProvider`, `InstanceInputStream`, `InstanceOutputStream` | Hub API client SDK types |
| 23 | `./api-client/manager-client` | `ManagerClient` | Manager API client SDK types |
| 24 | `./sd-content-type` | `ContentType` | Service Discovery content type union |
| 25 | `./sd-topic-handler` | `TopicHandler`, `TopicOptions`, `TopicState` | Service Discovery topic handler interface |
| 26 | `./topic-router` | `TopicsPostReq`, `TopicsPostRes`, `TopicDeleteReq`, `TopicStreamReq`, `TopicStreamReqWithContinue` | Topic routing HTTP request/response types |
| 27 | `./storage-adapter` | `IStorageAdapter` | Storage adapter interface for persistence layer |
| 28 | `./sequence-package-json` | `SequencePackageJSON`, `PortConfig`, `SequencePackageJSONScramjetSection` | Sequence package.json structure definition |
| 29 | `./dto/index` | `StartSequenceDTO`, `StartSequenceEndpointPayloadDTO`, `SetSequenceEndpointPayloadDTO` | REST API DTOs for sequence lifecycle operations |
| 30 | `./rest-api-error/rest-api-error` | `APIErrorMessage` | REST API error response shape |
| 31 | `./sd-stream-handler` (partial) | `StreamOptions`, `OriginType`, `StreamHandler`, `StreamOrigin`, `StreamState`, `WorkState`, `WritableState`, `ReadableState`, `StreamType` | Service Discovery stream handler types (selective re-export) |
| 32 | `./rest-api-sth` (namespace `STHRestAPI`) | `GetSequenceResponse`, `StartSequencePayload`, `GetInstanceResponse`, `GetInstancesResponse`, `GetSequencesResponse`, `GetVersionResponse`, `GetConfigResponse`, `GetHealthResponse`, `GetStatusResponse`, `GetEntitiesResponse`, `GetTopicsResponse`, `SendStopInstanceResponse`, `SendKillInstanceResponse`, `ControlMessageResponse`, `DeleteSequenceResponse`, common types | STH REST API DTOs |
| 33 | `./rest-api-middleware` (namespace `MWRestAPI`) | `GetMultiManagerResponse`, `GetMultiManagersResponse`, `GetVersionResponse` | Middleware REST API DTOs |
| 34 | `./rest-api-multi-manager` (namespace `MMRestAPI`) | `CreateManagerResponse`, `StopManagerResponse`, `GetManagerResponse`, `GetManagersResponse`, `GetVersionResponse`, `GetInfoResponse`, `GetLoadCheckResponse`, `AccessKeyResponse`, common types | Multi-manager REST API DTOs |
| 35 | `./rest-api-manager` (namespace `MRestAPI`) | `GetHostInfoResponse`, `ConnectedSTHInfo`, `GetConfigResponse`, `GetSequencesResponse`, `GetSequenceIDSResponse`, `GetInstancesResponse`, `GetTopicsResponse`, `GetStoreItemsResponse`, `PutStoreItemResponse`, `PostDisconnectPayload`, `PostDisconnectResponse`, `HubDeleteResponse`, common types | Manager REST API DTOs |

### 3.4 Local-only — Types belonging to owning implementation packages

| # | Source module | Key exports | Owning package | Rationale |
|---|---|---|---|---|
| 1 | `./lifecycle-adapters` | `ILifeCycleAdapterMain`, `ILifeCycleAdapterRun`, `ExitCode`, `LifeCycleError` | `@scramjet/adapters` or adapters implementation | Concrete lifecycle adapter interfaces used by adapter implementations (docker, process, kubernetes). Not needed by sequence authors or the runtime core. |
| 2 | `./runtime-executor` | `BootConfig`, `SpawnOptions`, `RuntimeExecutor`, `RuntimeProcessHandles`, `PythonSpawnOptions`, `NodeSpawnOptions`, `BunSpawnOptions`, `selectRuntimeKind`, `RuntimeKind` | `@scramjet/runner` | Runner-internal process management types. `BootConfig` is the contract passed to runner-node/runner-python child processes. |
| 3 | `./csh-connector` | `IHostClient` | Runner packages (runner-node, runner-python, runner-bun) | Runner-to-host communication interface; used by runtime wrappers to talk to the host. Not consumed by sequence authors or API consumers. |

### 3.5 Shared-exception — Must remain in shared types despite ownership elsewhere

| # | Source module | Key exports | Reason for exception |
|---|---|---|---|
| 1 | `./sequence-adapter` | `ISequenceAdapter`, `SequenceInfo`, `SequenceInfoInstance` | `SequenceInfo` is a dependency of `instance-store.ts` (`Instance`), `lifecycle-adapters.ts`, and `runtime-executor.ts` (`BootConfig`). `ISequenceAdapter` is the sequence adapter contract. Too many cross-cutting consumers to extract cleanly without a protocol layer. |
| 2 | `./runtime-adapter` | `IAdapterAugmentation`, `RuntimeOptionRegistry`, `RuntimeOptionDescriptor`, `AdapterInitializeFunction`, `AdapterAugmentOptionsFunction`, `AdapterAugmentConfigFunction` | The adapter registration contract is consumed by both host configuration (`sth-configuration.ts`) and adapter packages. Acts as the plugin API for adapters. |
| 3 | `./runner` (protocol subset) | `RunnerMessage`, `CPMMessage` | These protocol tuple types are consumed by both runner and host/manager message handling. They describe the wire format. Keep in shared-types as a thin re-export or inline in the protocol layer. |

---

## 4. Import Group Definitions for Phase 2/3

These import groups define how the split packages should import from each other. The dependency direction is: **runtime-types ← sequence-types ← api-types**, where api-types may also depend directly on runtime-types.

### Group A: `@scramjet/runtime-types` — Zero external @scramjet dependencies

```
app-config.ts         → standalone
component.ts          → imports from ./object-logger
error-codes/          → standalone (string literal unions + Error type)
functions.ts          → imports from ./utils
lifecycle.ts          → imports from ./messages, ./communication-handler (moved to api-types), ./lifecycle-adapters (local-only), ./runner-config, ./utils
local-storage.ts      → standalone
logger.ts             → imports from ./utils
message-streams.ts    → imports from ./utils, @scramjet/symbols (external)
object-logger.ts      → imports from stream (Node built-in)
op-response.ts        → imports from http-status-codes (external)
runner.ts             → imports from @scramjet/symbols (external)
runner-config.ts      → imports from ./instance-limits, ./instance, ./sequence-package-json (api-types), ./sth-configuration (api-types) → **needs refactoring** to remove api-types dependency
runner-connect.ts     → imports from ./app-config, ./instance-limits, ./object-logger
runner-transport.ts   → imports from ./message-streams
runtime-adapter.ts    → imports from ./sth-configuration (api-types), ./lifecycle-adapters (local-only), ./sequence-adapter (shared-exception), ./utils → **needs refactoring** to abstract STHConfiguration dependency
utils.ts              → imports from stream (Node built-in)
```

**Refactoring needed**: `runner-config.ts` imports `RunnerContainerConfiguration` from `sth-configuration.ts` (api-types) and `PortConfig` from `sequence-package-json.ts` (api-types). These should be inlined or the dependency inverted.

### Group B: `@scramjet/sequence-types` — Imports from runtime-types

```
app-context.ts         → imports from ./error-codes, ./app-config, ./messages/describe-sequence (api-types), ./object-logger, ./utils, ./messages (api-types), ./local-storage
application.ts         → imports from @scramjet/symbols (external), ./utils, ./app-context, ./app-config
```

**Refactoring needed**: `app-context.ts` imports `FunctionDefinition` from `./messages/describe-sequence` (currently api-types). The `FunctionDefinition` type is needed by `AppContext.definition` and `AppContext.describe()`. This is a core sequence concept — `FunctionDefinition` should move to runtime-types or sequence-types.

### Group C: `@scramjet/api-types` — Imports from runtime-types, possibly sequence-types

```
api-expose.ts              → imports from http (Node built-in), scramjet (external), stream (built-in), ./communication-handler, ./message-streams, ./object-logger, ./utils, net (built-in)
cpm-connector.ts           → imports from ./sth-configuration
communication-handler.ts   → imports from scramjet (external), stream (built-in), ./object-logger, ./logger, ./message-streams, ./utils, ./instance
client-utils/               → imports from http/https/stream (built-in), ./api-expose
manager-configuration.ts    → imports from ./utils, ./verser2-transport-configuration
manager/                    → many imports from ../index (circular!), ./object-logger, ./sth-connection-store
messages/                   → each message file is standalone or imports from ./load-check-stat, ./network-info, etc.
monitoring-server.ts        → imports from ./utils
module-loader.ts            → standalone
sth-configuration.ts        → imports from ./local-storage, ./monitoring-server, ./object-logger, ./telemetry-config, ./verser2-transport-configuration
load-check-stat.ts          → standalone
network-info.ts             → standalone
instance-store.ts           → imports from @scramjet/symbols (external), ./app-config, ./instance, ./sequence-adapter (shared-exception)
instance.ts                 → imports from @scramjet/symbols (external), ./app-config, ./sequence-adapter
instance-limits.ts          → standalone
instance-stats.ts           → imports from ./instance-limits
sth-command-options.ts      → imports from ./object-logger, ./telemetry-config
telemetry-config.ts         → standalone
verser2-transport-configuration.ts → standalone
host-proxy.ts              → imports from stream (built-in)
api-client/*               → imports from stream (built-in), ./load-check-stat, ./messages, ./rest-api-sth, ./sth-configuration, ./client-utils
sd-content-type.ts         → standalone
sd-topic-handler.ts        → imports from stream (built-in), ./sd-content-type, ./sd-stream-handler
sd-stream-handler.ts       → imports from @scramjet/symbols (external)
topic-router.ts            → imports from http (built-in), ./sd-stream-handler, ./sd-topic-handler, ./sd-content-type
storage-adapter.ts         → standalone
sequence-package-json.ts   → imports from ./instance
dto/*                      → imports from ./app-config, ./object-logger
rest-api-error/            → imports from @scramjet/symbols (external)
rest-api-sth/*             → mostly standalone DTOs, some import from ./load-check-stat, ./instance, etc.
rest-api-manager/*         → mostly standalone DTOs
rest-api-middleware/*      → mostly standalone DTOs
rest-api-multi-manager/*   → mostly standalone DTOs
rest-api-commons/*         → imports from ./load-check-stat
```

---

## 5. Shared Protocol Exceptions

The following types form the "glue layer" that multiple packages depend on. They should remain in a shared location (either kept in a slimmed-down `@scramjet/types` or migrated to `@scramjet/symbols`):

| Type | Consumers | Notes |
|---|---|---|
| `SequenceInfo` | instance-store, lifecycle-adapters, runtime-executor | Data shape about a loaded sequence. Too many consumers to duplicate. |
| `ISequenceAdapter` | lifecycle-adapters, runtime-adapter | Adapter interface contract. Could move to adapters package with inversion. |
| `IAdapterAugmentation` | sth-configuration, adapter packages | Plugin API for adapters. |
| `RunnerMessage` / `CPMMessage` | runner, communication-handler, message handling code | Wire format tuples. Very thin — could be a re-export from symbols. |
| `AppError` / `AppErrorCode` | app-context, error handling across all layers | Universal error type. Must stay shared. |
| `FunctionDefinition` | app-context, messages/describe-sequence, sequence package.json | Defines what a sequence looks like. Used in both the sequence API and the wire protocol. Could move to runtime-types. |

**Recommendation**: Keep `AppError`/`AppErrorCode` (and the error code sub-unions) in `@scramjet/runtime-types`. Keep `SequenceInfo`, `ISequenceAdapter`, `IAdapterAugmentation` as thin re-exports from a slimmed shared-types package, or inline them into the consuming packages with interface extraction. The protocol message tuples (`RunnerMessage`, `CPMMessage`) should become re-exports from `@scramjet/symbols`.

---

## 6. Local-only Candidates

These modules export types that are consumed **only** by their owning implementation package and should be moved there (not to the split type packages):

| Module | Owned by | Types | Current consumers in packages |
|---|---|---|---|
| `lifecycle-adapters.ts` | `@scramjet/adapters` (or per-adapter packages) | `ILifeCycleAdapterMain`, `ILifeCycleAdapterRun`, `ExitCode`, `LifeCycleError` | `sth/src/`, `adapters-*/` packages |
| `runtime-executor.ts` | `@scramjet/runner` | `BootConfig`, `SpawnOptions`, `RuntimeExecutor`, `RuntimeProcessHandles`, `PythonSpawnOptions`, `NodeSpawnOptions`, `BunSpawnOptions` | `runner/src/`, `runner-node/`, `runner-python/`, `runner-bun/` |
| `csh-connector.ts` | Runner packages (shared runner lib) | `IHostClient` | `runner/src/`, `runner-node/src/`, `runner-python/`, `runner-bun/` |
| `component.ts` | Potentially move to runner or adapters | `IComponent` | Lightweight base interface — could stay in runtime-types as it's only ~5 lines |

**Migration strategy**:
1. Extract `lifecycle-adapters.ts` into `@scramjet/adapters` (or a `package/adapters-types` internal package)
2. Extract `runtime-executor.ts` into `@scramjet/runner`
3. Extract `csh-connector.ts` into runner shared code
4. Keep `component.ts` in runtime-types as-is (trivial, widely useful)

---

## Appendix A: Modules NOT exported from `index.ts` (internal-only)

These files exist in `src/` but are not re-exported:

| File | Contents | Note |
|---|---|---|
| `runner-update.ts` | `RunnerUpdateInfo` (partial update for running instance) | Not exported — internal to runner logic |
| `model.ts` | Empty file | Placeholder/unused |
| `rest-api-commons/` | `GetLoadCheckResponse`, `GetVersionResponse` | Not exported from index.ts; used internally by the REST API modules |

## Appendix B: Selective re-exports in `index.ts`

Line 65: `export { StreamState, StreamOptions, OriginType, StreamHandler, StreamOrigin } from "./sd-stream-handler"` — selective re-export from `sd-stream-handler.ts`. The full file also exports/imports `WorkState`, `WritableState`, `ReadableState`, `StreamType` from `@scramjet/symbols` which are already available via that package.

Lines 55-58: Namespace-exports `MRestAPI`, `MWRestAPI`, `MMRestAPI`, `STHRestAPI` — these are bucket exports for REST API DTO types and should move with the rest of api-types.

# API

## Compatibility and version resolution

Compatibility: v1 remains accessible at any nested level under v2; v2 is not supported under v1.

Examples:
- `/api/v1/cpm/:managerId/topic` is equivalent to `/api/v2/cpm/:managerId/api/v2/topic`;
- `/api/v2/cpm/:managerId/api/v1/topic` works;
- `/api/v1/.../api/v1/...` works;
- `/api/v1/.../api/v2/...` is unsupported.

Inferred API version is always the first version in the path, which means that `/api/v2/.../legacy-v1-endpoint/...` will not autoresolve to the correct endpoint, even if the naming of v2 would not mask it.

## v1

### mmgr

| Method | Path | In | Out |
| --- | --- | --- | --- |
| GET | `/api/v1/version` | `void` | `MMRestAPI.GetVersionResponse` |
| GET | `/api/v1/info` | `void` | `MMRestAPI.GetInfoReposnse` |
| GET | `/api/v1/load-check` | `void` | `MMRestAPI.GetLoadCheckResponse` |
| GET | `/api/v1/list` | `void` | `MMRestAPI.GetManagersResponse` |
| GET | `/api/v1/health` | `void` | `HealthCheckInfo` |
| GET | `/api/v1/verser2/trust/:id?` | `MMRestAPI.GetTrustParams` | `MultiManagerVerser2TrustExport` |
| POST | `/api/v1/start` | `MMRestAPI.SendStartManagerPayload` | `MMRestAPI.OpResponse<MMRestAPI.SendStartManagerResponse>` |
| POST | `/api/v1/cpm/:managerId/stop` | `MMRestAPI.SendStopManagerPayload` | `MMRestAPI.OpResponse<MMRestAPI.SendStopManagerResponse>` |
| GET | `/api/v1/log` | `void` | `ReadableStream<LogRecord>` |
| GET | `/api/v1/audit` | `void` | `ReadableStream<AuditRecord>` |

### mgr

| Method | Path | In | Out |
| --- | --- | --- | --- |
| GET | `/api/v1/cpm/:managerId/version` | `MRestAPI.ManagerParams` | `MRestAPI.GetVersionResponse` |
| GET | `/api/v1/cpm/:managerId/config` | `MRestAPI.ManagerParams` | `MRestAPI.GetConfigResponse` |
| GET | `/api/v1/cpm/:managerId/verser2/trust` | `MRestAPI.ManagerParams` | `ManagerVerser2TrustExport` |
| GET | `/api/v1/cpm/:managerId/load` | `MRestAPI.ManagerParams` | `MRestAPI.GetLoadResponse` |
| GET | `/api/v1/cpm/:managerId/health` | `MRestAPI.ManagerParams` | `HealthCheckInfo` |
| POST | `/api/v1/cpm/:managerId/sth` | `SthRegistrationPayload` | `MRestAPI.PostHubResponse` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/info` | `MRestAPI.HubParams` | `MRestAPI.GetHostInfoResponse` |
| DELETE | `/api/v1/cpm/:managerId/sth/:hubId` | `MRestAPI.HubDeletePayload` | `MRestAPI.HubDeleteResponse` |
| GET | `/api/v1/cpm/:managerId/list` | `MRestAPI.GetListQuery` | `MRestAPI.GetListResponse` |
| GET | `/api/v1/cpm/:managerId/instances` | `MRestAPI.GetInstancesQuery` | `MRestAPI.GetInstancesResponse` |
| GET | `/api/v1/cpm/:managerId/sequences` | `MRestAPI.ManagerParams` | `MRestAPI.GetSequenceIDSResponse` |
| GET | `/api/v1/cpm/:managerId/all_sequences` | `MRestAPI.GetSequencesQuery` | `MRestAPI.GetSequencesResponse` |
| GET | `/api/v1/cpm/:managerId/entities` | `MRestAPI.ManagerParams` | `MRestAPI.GetEntitiesResponse` |
| GET | `/api/v1/cpm/:managerId/topics` | `MRestAPI.ManagerParams` | `MRestAPI.GetTopicsResponse` |
| GET | `/api/v1/cpm/:managerId/log` | `MRestAPI.ManagerParams` | `ReadableStream<LogRecord>` |
| GET | `/api/v1/cpm/:managerId/load-stream` | `MRestAPI.ManagerParams` | `ReadableStream<MRestAPI.GetLoadResponse>` |
| GET | `/api/v1/cpm/:managerId/topic/:name` | `MRestAPI.TopicParams` | `ReadableStream<TopicChunk>` |
| POST | `/api/v1/cpm/:managerId/topic/:name` | `MRestAPI.TopicDownstreamPayload` | `OpResponse<Record<string, unknown>>` |
| DELETE | `/api/v1/cpm/:managerId/store` | `MRestAPI.ManagerParams` | `MRestAPI.StoreClearResponse` |
| GET | `/api/v1/cpm/:managerId/s3` | `MRestAPI.ManagerParams` | `MRestAPI.GetStoreItemsResponse` |
| GET | `/api/v1/cpm/:managerId/s3/:directory/:filename?` | `MRestAPI.GetStoreItemPayload` | `ReadableStream<StoredObject>` |
| PUT | `/api/v1/cpm/:managerId/s3/:filename?` | `MRestAPI.PutStoreItemPayload` | `MRestAPI.PutStoreItemResponse` |
| DELETE | `/api/v1/cpm/:managerId/s3/:filename` | `MRestAPI.DeleteStoreItemPayload` | `MRestAPI.DeleteStoreItemResponse` |
| POST | `/api/v1/cpm/:managerId/disconnect` | `MRestAPI.PostDisconnectPayload` | `MRestAPI.PostDisconnectResponse` |

### hub

| Method | Path | In | Out |
| --- | --- | --- | --- |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/load-check` | `STHRestAPI.HubParams` | `STHRestAPI.GetLoadCheckResponse` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/version` | `STHRestAPI.HubParams` | `STHRestAPI.GetVersionResponse` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/config` | `STHRestAPI.HubParams` | `STHRestAPI.GetConfigResponse` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/status` | `STHRestAPI.HubParams` | `STHRestAPI.GetStatusResponse` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/audit` | `STHRestAPI.HubParams` | `ReadableStream<AuditRecord>` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/sequences` | `STHRestAPI.HubParams` | `STHRestAPI.GetSequencesResponse` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/instances` | `STHRestAPI.HubParams` | `STHRestAPI.GetInstancesResponse` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/entities` | `STHRestAPI.HubParams` | `STHRestAPI.GetEntitiesResponse` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/log` | `STHRestAPI.HubParams` | `ReadableStream<LogRecord>` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/topics` | `STHRestAPI.HubParams` | `STHRestAPI.GetTopicsResponse` |
| POST | `/api/v1/cpm/:managerId/sth/:hubId/topics` | `TopicPostPayload` | `OpResponse<TopicPostResponse>` |
| DELETE | `/api/v1/cpm/:managerId/sth/:hubId/topics/:topic` | `TopicDeletePayload` | `OpResponse<TopicDeleteResponse>` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/topic/:topic` | `TopicStreamPayload` | `ReadableStream<TopicChunk>` |
| POST | `/api/v1/cpm/:managerId/sth/:hubId/topic/:topic` | `TopicStreamPayload` | `OpResponse<Record<string, unknown>>` |

### seq

| Method | Path | In | Out |
| --- | --- | --- | --- |
| POST | `/api/v1/cpm/:managerId/sth/:hubId/sequence` | `STHRestAPI.SendSequencePayload` | `OpResponse<STHRestAPI.SendSequenceResponse>` |
| PUT | `/api/v1/cpm/:managerId/sth/:hubId/sequence/:sequenceId` | `STHRestAPI.SendSequencePayload` | `OpResponse<STHRestAPI.SendSequenceResponse>` |
| DELETE | `/api/v1/cpm/:managerId/sth/:hubId/sequence/:sequenceId` | `STHRestAPI.DeleteSequencePayload` | `OpResponse<STHRestAPI.DeleteSequenceResponse>` |
| POST | `/api/v1/cpm/:managerId/sth/:hubId/sequence/:sequenceId/start` | `STHRestAPI.StartSequencePayload` | `OpResponse<STHRestAPI.StartSequenceResponse>` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/sequence/:sequenceId` | `STHRestAPI.GetSequencePayload` | `STHRestAPI.GetSequenceResponse` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/sequence/:sequenceId/instances` | `STHRestAPI.GetSequenceInstancesPayload` | `STHRestAPI.GetSequenceInstancesResponse` |

### inst

| Method | Path | In | Out |
| --- | --- | --- | --- |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId` | `STHRestAPI.GetInstancePayload` | `STHRestAPI.GetInstanceResponse` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/stdout` | `STHRestAPI.InstanceStreamPayload` | `ReadableStream<Buffer>` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/stderr` | `STHRestAPI.InstanceStreamPayload` | `ReadableStream<Buffer>` |
| POST | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/stdin` | `STHRestAPI.InstanceStreamPayload` | `OpResponse<Record<string, unknown>>` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/log` | `STHRestAPI.InstanceStreamPayload` | `ReadableStream<LogRecord>` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/monitoring` | `STHRestAPI.InstanceStreamPayload` | `ReadableStream<MonitoringMessage>` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/output` | `STHRestAPI.InstanceStreamPayload` | `ReadableStream<Buffer>` |
| POST | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/input` | `STHRestAPI.InstanceStreamPayload` | `OpResponse<Record<string, unknown>>` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/health` | `STHRestAPI.GetHealthPayload` | `RunnerMessageCode.MONITORING` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/events/:name` | `STHRestAPI.GetEventPayload` | `ReadableStream<EventMessageData>` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/event/:name` | `STHRestAPI.GetEventPayload` | `STHRestAPI.GetEventResponse` |
| GET | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/once/:name` | `STHRestAPI.GetEventPayload` | `STHRestAPI.GetNextEventResponse` |
| POST | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/_monitoring_rate` | `MonitoringRateMessage` | `OpResponse<Record<string, unknown>>` |
| POST | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/_event` | `EventMessage` | `OpResponse<STHRestAPI.SendEventResponse>` |
| POST | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/_stop` | `STHRestAPI.StopInstancePayload` | `OpResponse<STHRestAPI.SendStopInstanceResponse>` |
| POST | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/_kill` | `STHRestAPI.KillInstancePayload` | `OpResponse<STHRestAPI.SendKillInstanceResponse>` |
| POST | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/set` | `SetSequenceMessage` | `OpResponse<Record<string, unknown>>` |

### rpc

| Method | Path | In | Out |
| --- | --- | --- | --- |
| ANY | `/api/v1/cpm/:managerId/sth/:hubId/instance/:instanceId/rpc/*` | `HttpRequest` | `HttpResponse` |
| ANY | `/api/v1/cpm/:managerId/sth/:hubId/rpc/*` | `HttpRequest` | `HttpResponse` |

## v2 package and contract model

`@scramjet/rest-api2` is the new package boundary for the v2 public API and exports the `RestAPI2` namespace. It owns v2 route contracts, v2 request/response DTOs, v2 stream descriptors, and the single common v2 client used by package tests, BDD tests, HTTP consumers, and verser2 consumers.

The v2 package must not reuse or alias old public API contracts. Existing `MMRestAPI.*`, `MRestAPI.*`, `STHRestAPI.*`, and un-namespaced v1 DTOs may be used as implementation references for compatibility adapters, but the exported v2 package types must be new `RestAPI2.*` contracts.

This document defines the target v2 shape. Implementation is deferred to the migration phases after this contract is approved.

v2 routing must use verser2 forwarding, resolution, and redirects for cross-node routing. New manual HTTP forwarding layers or bespoke forwarding protocols should not be implemented for v2 routes; compatibility code should adapt to verser2-backed routing instead.

Route implementation ownership follows the API level that owns the behavior, even when the public path is nested under `/api/v2/managers/:managerId/...`. MultiManager routes own only MultiManager behavior and Manager selection. Manager routes own Manager-level inventory, storage, topics, logs, audit, and Hub selection. Host routes own Hub, Sequence, Instance/CSI, stdio, Instance RPC, Hub RPC, and Hub audit behavior. Cross-level public paths should resolve to the owning router through verser2-backed routing instead of being reimplemented as MultiManager-level proxy handlers.

Path shapes are distinct:

- **Public path**: the canonical client/OpenAPI path. It may contain parent identifiers such as `:managerId`, `:hubId`, and `:instanceId`.
- **Mount path**: the hook-up or resolution point where a parent router attaches or delegates to a child router. The parent owns resolving identifiers consumed by this prefix.
- **Implementer path**: the relative path inside the owning router. Implementer routers must not bake in parent prefixes or parent identifiers they do not own.

Examples:

- Public Hub load path: `/api/v2/managers/:managerId/hubs/:hubId/load`; Host-owned Hub implementer path: `/load`.
- Public Instance stdio path: `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/stdio`; CSI/Instance implementer path after parent resolution: `/stdio`.
- Public operation IDs and generated manifests may compose public paths from mounts, but the owning router's route definitions remain local.

### Generic structures

| Contract | Shape |
| --- | --- |
| `RestAPI2.Empty` | Empty request object, used instead of `void` when a request type must be explicit. |
| `RestAPI2.IdParams<TScope>` | Path identifiers for a scope such as `MultiManager`, `Manager`, `Hub`, `Sequence`, `Instance`, `Topic`, or `StoreItem`. |
| `RestAPI2.ListQuery<TItem>` | Pagination, filtering, sorting, and stream-range selection for list endpoints. |
| `RestAPI2.ListResponse<TItem>` | `{ items: TItem[]; page?: RestAPI2.PageInfo; stream?: RestAPI2.StreamInfo; links?: RestAPI2.Links }`. |
| `RestAPI2.OpResponse<TOutput>` | `{ operation: RestAPI2.Operation; result?: TOutput; error?: RestAPI2.ErrorBody }`. |
| `RestAPI2.NoContent<Status>` | Empty body response with the indicated HTTP status, for example `RestAPI2.NoContent<202>`. |
| `RestAPI2.StreamRange` | Parsed `Content-Range` request span or time range. |
| `RestAPI2.StreamInfo` | Response metadata for ranged or live stream reads. |
| `RestAPI2.StreamDescriptor<TItem>` | Describes a streamable endpoint and the item contract emitted by the stream. |
| `RestAPI2.ErrorBody` | v2 error envelope independent from v1 error DTOs. |

### Common client

The v2 package exposes one common client surface for all API levels. The client resolves the same `RestAPI2.*` operation contracts over HTTP and verser2 transports, rather than generating separate clients for MultiManager, Manager, Hub, Sequence, Instance, audit, stdio, or RPC surfaces.

| Contract | Purpose |
| --- | --- |
| `RestAPI2.Client` | Common typed client for all v2 operations. |
| `RestAPI2.ClientTransport` | Transport contract implemented by HTTP and verser2 adapters. |
| `RestAPI2.ClientRequest<TOperation>` | Typed request envelope for a v2 operation. |
| `RestAPI2.ClientResponse<TOperation>` | Typed response envelope for a v2 operation. |
| `RestAPI2.OperationId` | Stable operation identifier shared by route definitions, OpenAPI output, and the common client. |

### Specific outputs

| Contract | Purpose |
| --- | --- |
| `RestAPI2.MultiManager` | MultiManager identity, API base, version, config summary, load, health, and trust-relevant public state. |
| `RestAPI2.Manager` | Manager identity, API base, version, config summary, load, health, connected hub counts, and trust-relevant public state. |
| `RestAPI2.Hub` | Hub identity, status, version, config summary, load, sequence counts, instance counts, and topic counts. |
| `RestAPI2.Sequence` | Sequence identity, metadata, config summary, status, current instances, and package/source descriptors. |
| `RestAPI2.Instance` | Instance identity, sequence reference, hub reference, status, parameters, monitoring summary, and stream descriptors. |
| `RestAPI2.Entity` | Shared entity listing output for manager and hub scopes. |
| `RestAPI2.Topic` | Topic identity, direction, stream descriptors, and retention/availability metadata. |
| `RestAPI2.StoreItem` | Stored sequence or object metadata exposed by storage endpoints. |
| `RestAPI2.LogRecord` | v2 log record independent from v1 log DTOs. |
| `RestAPI2.AuditRecord` | v2 audit record independent from v1 audit DTOs. |
| `RestAPI2.TrustExport<TScope>` | v2 trust export for the indicated scope. |
| `RestAPI2.HealthCheckInfo<TScope>` | v2 health check output for the indicated scope. |
| `RestAPI2.VersionResponse<TScope>` | v2 version output for the indicated scope. |
| `RestAPI2.ConfigResponse<TScope>` | v2 public-safe config output for the indicated scope. |
| `RestAPI2.LoadResponse<TScope>` | v2 load output for the indicated scope. |

### Specific requests and operation outputs

| Contract | Purpose |
| --- | --- |
| `RestAPI2.StartManagerPayload` / `RestAPI2.StartManagerResponse` | Start a managed Manager from the MultiManager API. |
| `RestAPI2.DeleteManagerPayload` / `RestAPI2.DeleteManagerResponse` | Stop or remove a managed Manager. |
| `RestAPI2.RegisterHubPayload` / `RestAPI2.RegisterHubResponse` | Register a Hub with a Manager. |
| `RestAPI2.DeleteHubPayload` / `RestAPI2.DeleteHubResponse` | Delete or detach a Hub from a Manager. |
| `RestAPI2.DisconnectHubPayload` / `RestAPI2.DisconnectHubResponse` | Disconnect one or more Hubs without deleting stored Manager state. |
| `RestAPI2.SendSequencePayload` / `RestAPI2.SendSequenceResponse` | Create or update a Sequence package. |
| `RestAPI2.DeleteSequencePayload` / `RestAPI2.DeleteSequenceResponse` | Delete a Sequence and define how related instances are handled. |
| `RestAPI2.StartSequencePayload` / `RestAPI2.StartSequenceResponse` | Start a Sequence and return the created Instance reference. |
| `RestAPI2.DeleteInstancePayload` / `RestAPI2.DeleteInstanceResponse` | Stop or kill an Instance. The body selects graceful stop versus forced kill and timeout behavior. |
| `RestAPI2.InstanceParametersPatch` / `RestAPI2.InstanceParametersResponse` | Update mutable Instance parameters such as monitoring rate and log levels. |
| `RestAPI2.EventPayload` / `RestAPI2.EventResponse` / `RestAPI2.NextEventResponse` | Read current, streamed, or next Instance event data. |
| `RestAPI2.EventMessage` / `RestAPI2.SendEventResponse` | Send an event to an Instance. |
| `RestAPI2.TopicCreatePayload` / `RestAPI2.TopicCreateResponse` | Create or configure a Hub topic. |
| `RestAPI2.TopicDeletePayload` / `RestAPI2.TopicDeleteResponse` | Delete a Hub topic. |
| `RestAPI2.TopicChunk` / `RestAPI2.TopicStreamResponse` | Stream topic data. |
| `RestAPI2.StoreItemPayload` / `RestAPI2.StoreItemResponse` / `RestAPI2.DeleteStoreItemPayload` / `RestAPI2.DeleteStoreItemResponse` | Read, write, and delete storage objects. |
| `RestAPI2.StoreClearPayload` / `RestAPI2.StoreClearResponse` | Clear a Manager storage scope. |
| `RestAPI2.AuditQuery` / `RestAPI2.AuditQueryResponse` | Query audit records without opening a live audit stream. |
| `RestAPI2.StdIODescriptorList` / `RestAPI2.StdIOChunk` | Describe and stream Instance stdio channels. |
| `RestAPI2.RpcRequest` / `RestAPI2.RpcResponse` | Pass-through RPC request/response envelope for specialized RPC endpoints. |
| `RestAPI2.RouteOwnership` / `RestAPI2.ForwardingRoute` / `RestAPI2.ForwardingResolution` | Describes public path, owner, mount path, implementer path, and verser2-backed route resolution, redirect, or local execution decisions for cross-node v2 requests. |

## v2

### mmgr

| Method | Path | In | Out | Streamable |
| --- | --- | --- | --- | --- |
| GET | `/api/v2/version` | `void` | `RestAPI2.VersionResponse<RestAPI2.MultiManager>` | |
| GET | `/api/v2/info` | `void` | `RestAPI2.InfoResponse<RestAPI2.MultiManager>` | |
| GET | `/api/v2/load` | `void` | `RestAPI2.LoadResponse<RestAPI2.MultiManager>` | yes |
| GET | `/api/v2/config` | `void` | `RestAPI2.ConfigResponse<RestAPI2.MultiManager>` | |
| GET | `/api/v2/managers` | `RestAPI2.ManagersQuery` | `RestAPI2.ManagersResponse` | |
| GET | `/api/v2/health` | `void` | `RestAPI2.HealthCheckInfo<RestAPI2.MultiManager>` | yes |
| GET | `/api/v2/verser2/trust/:managerId?` | `RestAPI2.TrustParams` | `RestAPI2.TrustExport<RestAPI2.MultiManager>` | |
| POST | `/api/v2/managers` | `RestAPI2.StartManagerPayload` | `RestAPI2.OpResponse<RestAPI2.StartManagerResponse>` | |
| DELETE | `/api/v2/managers/:managerId` | `RestAPI2.DeleteManagerPayload` | `RestAPI2.OpResponse<RestAPI2.DeleteManagerResponse>` | |
| GET | `/api/v2/logs` | `void` | `ReadableStream<RestAPI2.LogRecord>` | always |
| GET | `/api/v2/audit` | `void` | `ReadableStream<RestAPI2.AuditRecord>` | always |

### mgr

| Method | Path | In | Out | Streamable |
| --- | --- | --- | --- | --- |
| GET | `/api/v2/managers/:managerId/version` | `RestAPI2.ManagerParams` | `RestAPI2.VersionResponse<RestAPI2.Manager>` | |
| GET | `/api/v2/managers/:managerId/config` | `RestAPI2.ManagerParams` | `RestAPI2.ConfigResponse<RestAPI2.Manager>` | |
| GET | `/api/v2/managers/:managerId/verser2/trust` | `RestAPI2.ManagerParams` | `RestAPI2.TrustExport<RestAPI2.Manager>` | |
| GET | `/api/v2/managers/:managerId/load` | `RestAPI2.ManagerParams` | `RestAPI2.LoadResponse<RestAPI2.Manager>` | yes |
| GET | `/api/v2/managers/:managerId/health` | `RestAPI2.ManagerParams` | `RestAPI2.HealthCheckInfo<RestAPI2.Manager>` | yes |
| POST | `/api/v2/managers/:managerId/hubs` | `RestAPI2.RegisterHubPayload` | `RestAPI2.OpResponse<RestAPI2.RegisterHubResponse>` | |
| GET | `/api/v2/managers/:managerId/hubs` | `RestAPI2.ListQuery<RestAPI2.Hub>` | `RestAPI2.ListResponse<RestAPI2.Hub>` | yes |
| GET | `/api/v2/managers/:managerId/hubs/:hubId` | `RestAPI2.HubParams` | `RestAPI2.HostInfoResponse` | |
| DELETE | `/api/v2/managers/:managerId/inventory/hubs/:hubId` | `RestAPI2.DeleteHubQuery` | `RestAPI2.OpResponse<RestAPI2.DeleteHubResponse>` | |
| GET | `/api/v2/managers/:managerId/instances` | `RestAPI2.InstancesQuery` | `RestAPI2.ListResponse<RestAPI2.Instance>` | yes⁰ |
| GET | `/api/v2/managers/:managerId/sequences` | `RestAPI2.SequencesQuery` | `RestAPI2.ListResponse<RestAPI2.Sequence>` | yes⁰ |
| GET | `/api/v2/managers/:managerId/entities` | `RestAPI2.ManagerParams` | `RestAPI2.ListResponse<RestAPI2.Entity>` | yes⁰ |
| GET | `/api/v2/managers/:managerId/logs` | `RestAPI2.ManagerParams + RestAPI2.LogFilters` | `ReadableStream<RestAPI2.LogRecord>` | |
| GET | `/api/v2/managers/:managerId/topics` | `RestAPI2.ManagerParams` | `RestAPI2.ListResponse<RestAPI2.Topic>` | |
| GET | `/api/v2/managers/:managerId/topics/:name` | `RestAPI2.TopicParams` | `RestAPI2.TopicInformation` | |
| GET | `/api/v2/managers/:managerId/topics/:name/stream` | `RestAPI2.TopicParams` | `ReadableStream<RestAPI2.TopicChunk>` | always |
| POST | `/api/v2/managers/:managerId/topics/:name/stream` | `ReadableStream<RestAPI2.TopicChunk>` | `RestAPI2.OpResponse<RestAPI2.Topic>` | always |
| GET | `/api/v2/managers/:managerId/storage/sequences` | `RestAPI2.ManagerParams` | `RestAPI2.ListResponse<RestAPI2.StoreItem>` | yes⁰ |
| GET | `/api/v2/managers/:managerId/storage/objects/:directory/:filename?` | `RestAPI2.StoreItemPayload` | `ReadableStream<RestAPI2.BinaryChunk>` | always |
| PUT | `/api/v2/managers/:managerId/storage/objects/:filename?` | `RestAPI2.StoreItemPayload` | `RestAPI2.StoreItemResponse` | |
| DELETE | `/api/v2/managers/:managerId/storage/objects/:filename` | `RestAPI2.DeleteStoreItemPayload` | `RestAPI2.DeleteStoreItemResponse` | |
| DELETE | `/api/v2/managers/:managerId/storage` | `RestAPI2.StoreClearPayload` | `RestAPI2.StoreClearResponse` | |
| GET | `/api/v2/managers/:managerId/audit` | `RestAPI2.ManagerParams` | `ReadableStream<RestAPI2.AuditRecord>` | yes¹ |

Manager storage object endpoints are exposed as a WebDAV/S3-compatible proxy compatibility surface. Strong v2 typing and compatibility guarantees are intentionally not provided for that proxy surface yet; typed storage contracts can replace the proxy in a later storage-service migration.

### hub

| Method | Path | In | Out | Streamable |
| --- | --- | --- | --- | --- |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/load` | `RestAPI2.HubParams` | `RestAPI2.LoadResponse<RestAPI2.Hub>` | |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/version` | `RestAPI2.HubParams` | `RestAPI2.VersionResponse` | |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/config` | `RestAPI2.HubParams` | `RestAPI2.ConfigResponse` | |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/status` | `RestAPI2.HubParams` | `RestAPI2.StatusResponse` | |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/audit` | `RestAPI2.HubParams` | `ReadableStream<RestAPI2.AuditRecord>` | yes¹ |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/sequences` | `RestAPI2.HubParams` | `RestAPI2.ListResponse<RestAPI2.Sequence>` | |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances` | `RestAPI2.HubParams` | `RestAPI2.ListResponse<RestAPI2.Instance>` | |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/entities` | `RestAPI2.HubParams` | `RestAPI2.ListResponse<RestAPI2.Entity>` | |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/logs` | `RestAPI2.HubParams` | `ReadableStream<RestAPI2.LogRecord>` | |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/topics` | `RestAPI2.HubParams` | `RestAPI2.ListResponse<RestAPI2.Topic>` | |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/topics` | `RestAPI2.TopicCreatePayload` | `RestAPI2.OpResponse<RestAPI2.TopicCreateResponse>` | |
| DELETE | `/api/v2/managers/:managerId/hubs/:hubId/topics/:topic` | `RestAPI2.TopicDeletePayload` | `RestAPI2.OpResponse<RestAPI2.TopicDeleteResponse>` | |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/topics/:topic/stream` | `RestAPI2.TopicStreamPayload` | `ReadableStream<RestAPI2.TopicChunk>` | |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/topics/:topic/stream` | `RestAPI2.TopicStreamPayload` | `RestAPI2.OpResponse<RestAPI2.TopicStreamResponse>` | |

### seq

| Method | Path | In | Out | Streamable |
| --- | --- | --- | --- | --- |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/sequences` | `RestAPI2.SendSequencePayload` | `RestAPI2.OpResponse<RestAPI2.SendSequenceResponse>` | |
| PUT | `/api/v2/managers/:managerId/hubs/:hubId/sequences/:sequenceId` | `RestAPI2.SendSequencePayload` | `RestAPI2.OpResponse<RestAPI2.SendSequenceResponse>` | |
| DELETE | `/api/v2/managers/:managerId/hubs/:hubId/sequences/:sequenceId` | `RestAPI2.DeleteSequencePayload` | `RestAPI2.OpResponse<RestAPI2.DeleteSequenceResponse>` | |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/sequences/:sequenceId/instances` | `RestAPI2.StartSequencePayload` | `RestAPI2.OpResponse<RestAPI2.StartSequenceResponse>` | |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/sequences/:sequenceId` | `RestAPI2.SequencePayload` | `RestAPI2.SequenceResponse` | |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/sequences/:sequenceId/instances` | `RestAPI2.SequenceInstancesPayload` | `RestAPI2.ListResponse<RestAPI2.Instance>` | |

### inst

| Method | Path | In | Out | Streamable |
| --- | --- | --- | --- | --- |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId` | `RestAPI2.Empty` | `RestAPI2.InstanceResponse` | |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/stdio` | `RestAPI2.Empty` | `RestAPI2.StdIODescriptorList` | yes² |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/logs` | `RestAPI2.LogFilter` | `ReadableStream<RestAPI2.LogRecord>` | yes |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/monitoring` | `RestAPI2.InstanceStreamPayload` | `ReadableStream<RestAPI2.MonitoringMessage>` | yes⁰ |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/output` | `RestAPI2.InstanceStreamPayload` | `ReadableStream<RestAPI2.BinaryChunk>` | always + output consumption |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/input` | `ReadableStream<RestAPI2.BinaryChunk>` | `RestAPI2.NoContent<202>` | always |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/health` | `RestAPI2.HealthPayload` | `RestAPI2.RunnerMessageCode.MONITORING` | |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/events/:name/stream` | `RestAPI2.EventPayload` | `ReadableStream<RestAPI2.EventMessageData>` | |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/events/:name` | `RestAPI2.EventPayload` | `RestAPI2.EventResponse` | |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/events/:name/once` | `RestAPI2.EventPayload` | `RestAPI2.NextEventResponse` | |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/events` | `RestAPI2.EventMessage` | `RestAPI2.OpResponse<RestAPI2.SendEventResponse>` | |
| DELETE | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId` | `RestAPI2.DeleteInstancePayload` | `RestAPI2.OpResponse<RestAPI2.DeleteInstanceResponse>` | |
| PATCH | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId` | `RestAPI2.InstanceParametersPatch` | `RestAPI2.OpResponse<RestAPI2.InstanceParametersResponse>` | |

### rpc

| Method | Path | In | Out | Streamable |
| --- | --- | --- | --- | --- |
| ANY | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/rpc/*` | `RestAPI2.RpcRequest` | `RestAPI2.RpcResponse` | |
| ANY | `/api/v2/managers/:managerId/hubs/:hubId/rpc/*` | `RestAPI2.RpcRequest` | `RestAPI2.RpcResponse` | |

### audit

| Method | Path | In | Out | Streamable |
| --- | --- | --- | --- | --- |
| GET | `<object endpoint>/audit` | `RestAPI2.Params<T>` | `ReadableStream<RestAPI2.AuditRecord>` | yes¹ |
| GET | `<object endpoint>/audit/:auditId` | `RestAPI2.AuditRecordParams` | `RestAPI2.AuditRecord` | |
| GET | `<object endpoint>/audit/query` | `RestAPI2.AuditQuery` | `RestAPI2.AuditQueryResponse` | yes¹ |

### stdio

| Method | Path | In | Out | Streamable |
| --- | --- | --- | --- | --- |
| GET | `<instance endpoint>/stdio` | `RestAPI2.InstanceStreamPayload` | `RestAPI2.StdIODescriptorList` | yes² |
| POST | `<instance endpoint>/stdio/0` | `ReadableStream<RestAPI2.StdIOChunk>` | `RestAPI2.NoContent<202>` | always |
| GET | `<instance endpoint>/stdio/1` | `void` | `ReadableStream<RestAPI2.StdIOChunk>` | always |
| GET | `<instance endpoint>/stdio/2` | `void` | `ReadableStream<RestAPI2.StdIOChunk>` | always |

### Streaming Endpoints

Streamable endpoints are indicated below and can instantiated with a `Content-Range: time <start>-<end>` header to request a time range of data. The `start` and `end` values are milliseconds since the epoch, or `*` for the start or end of the stream. Alternatively, a `Content-Range: span <start>-<end>` header can be used to request a span of data, where `start` and `end` are milliseconds since now. A typical query for the last 10 seconds of a stream would be `Content-Range: span 10000-*` - content ranges are negative only (meaning that the span goes backwards in time only - the asterisk will cause the response to continue sending updates). The server may return a `206 Partial Content` response with a `Content-Range` header indicating the actual range of data returned. The result type is a `ReadableStream` of the indicated type, which can be consumed with a `for await` loop or other streaming methods.

Streaming endpoints can follow these rules:

- When the content range is not finite, streamable endpoints will work in streamed mode and a `206 Partial Content` response code - the response envelope will be a `ReadableStream` of the indicated type, not the usual JSON envelope.
- When the content range is finite, streamable endpoints will work in non-streamed mode and a `200 OK` response code - the response envelope will be a `RestAPI2.ListResponse` of the indicated type, not a `ReadableStream`.

Some endpoints are marked as "always" streamable, meaning that they will always return a `ReadableStream` of data.

Streaming notes:

* `⁰` - Historical sequence and instance endpoints are streamable, the historical sequence/instance information might not implement full objects.
* `¹` - Audit is streamable by default, non-ranged requests can be achieved on specific sub-endpoints, see `audit` section for details.
* `²` - Stdio is streamable by default, non-ranged requests can be achieved on specific sub-endpoints, see `stdio` section for details.
* `always` - The endpoint is always streamable, and will always return a `ReadableStream` of data. The `Content-Range` header is ignored for these endpoints.
* `output consumption` - The endpoint consumes the output and will not return the data again.

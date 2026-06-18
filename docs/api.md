# API

Compatibility: v1 remains accessible at any nested level under v2; v2 is not supported under v1. Examples: `/api/v2/cpm/:managerId/api/v1/topic` works; `/api/v1/.../api/v1/...` works; `/api/v1/.../api/v2/...` is unsupported.

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

## v2

### mmgr

| Method | Path | In | Out |
| --- | --- | --- | --- |
| GET | `/api/v2/version` | `void` | `MMRestAPI.GetVersionResponse` |
| GET | `/api/v2/info` | `void` | `MMRestAPI.GetInfoReposnse` |
| GET | `/api/v2/load-check` | `void` | `MMRestAPI.GetLoadCheckResponse` |
| GET | `/api/v2/managers` | `MMRestAPI.GetManagersQuery` | `MMRestAPI.GetManagersResponse` |
| GET | `/api/v2/health` | `void` | `HealthCheckInfo` |
| GET | `/api/v2/verser2/trust/:managerId?` | `MMRestAPI.GetTrustParams` | `MultiManagerVerser2TrustExport` |
| POST | `/api/v2/managers` | `MMRestAPI.SendStartManagerPayload` | `MMRestAPI.OpResponse<MMRestAPI.SendStartManagerResponse>` |
| DELETE | `/api/v2/managers/:managerId` | `MMRestAPI.SendStopManagerPayload` | `MMRestAPI.OpResponse<MMRestAPI.SendStopManagerResponse>` |
| GET | `/api/v2/logs` | `void` | `ReadableStream<LogRecord>` |
| GET | `/api/v2/audit` | `void` | `ReadableStream<AuditRecord>` |

### mgr

| Method | Path | In | Out |
| --- | --- | --- | --- |
| GET | `/api/v2/managers/:managerId/version` | `MRestAPI.ManagerParams` | `MRestAPI.GetVersionResponse` |
| GET | `/api/v2/managers/:managerId/config` | `MRestAPI.ManagerParams` | `MRestAPI.GetConfigResponse` |
| GET | `/api/v2/managers/:managerId/verser2/trust` | `MRestAPI.ManagerParams` | `ManagerVerser2TrustExport` |
| GET | `/api/v2/managers/:managerId/load` | `MRestAPI.ManagerParams` | `MRestAPI.GetLoadResponse` |
| GET | `/api/v2/managers/:managerId/health` | `MRestAPI.ManagerParams` | `HealthCheckInfo` |
| POST | `/api/v2/managers/:managerId/hubs` | `SthRegistrationPayload` | `MRestAPI.PostHubResponse` |
| GET | `/api/v2/managers/:managerId/hubs` | `MRestAPI.GetListQuery` | `MRestAPI.GetListResponse` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId` | `MRestAPI.HubParams` | `MRestAPI.GetHostInfoResponse` |
| DELETE | `/api/v2/managers/:managerId/hubs/:hubId` | `MRestAPI.HubDeletePayload` | `MRestAPI.HubDeleteResponse` |
| POST | `/api/v2/managers/:managerId/hubs/disconnect` | `MRestAPI.PostDisconnectPayload` | `MRestAPI.PostDisconnectResponse` |
| GET | `/api/v2/managers/:managerId/instances` | `MRestAPI.GetInstancesQuery` | `MRestAPI.GetInstancesResponse` |
| GET | `/api/v2/managers/:managerId/sequences` | `MRestAPI.GetSequencesQuery` | `MRestAPI.GetSequencesResponse` |
| GET | `/api/v2/managers/:managerId/sequence-ids` | `MRestAPI.ManagerParams` | `MRestAPI.GetSequenceIDSResponse` |
| GET | `/api/v2/managers/:managerId/entities` | `MRestAPI.ManagerParams` | `MRestAPI.GetEntitiesResponse` |
| GET | `/api/v2/managers/:managerId/topics` | `MRestAPI.ManagerParams` | `MRestAPI.GetTopicsResponse` |
| GET | `/api/v2/managers/:managerId/logs` | `MRestAPI.ManagerParams` | `ReadableStream<LogRecord>` |
| GET | `/api/v2/managers/:managerId/load-stream` | `MRestAPI.ManagerParams` | `ReadableStream<MRestAPI.GetLoadResponse>` |
| GET | `/api/v2/managers/:managerId/topics/:name/stream` | `MRestAPI.TopicParams` | `ReadableStream<TopicChunk>` |
| POST | `/api/v2/managers/:managerId/topics/:name/stream` | `MRestAPI.TopicDownstreamPayload` | `OpResponse<Record<string, unknown>>` |
| GET | `/api/v2/managers/:managerId/storage/sequences` | `MRestAPI.ManagerParams` | `MRestAPI.GetStoreItemsResponse` |
| GET | `/api/v2/managers/:managerId/storage/objects/:directory/:filename?` | `MRestAPI.GetStoreItemPayload` | `ReadableStream<StoredObject>` |
| PUT | `/api/v2/managers/:managerId/storage/objects/:filename?` | `MRestAPI.PutStoreItemPayload` | `MRestAPI.PutStoreItemResponse` |
| DELETE | `/api/v2/managers/:managerId/storage/objects/:filename` | `MRestAPI.DeleteStoreItemPayload` | `MRestAPI.DeleteStoreItemResponse` |
| DELETE | `/api/v2/managers/:managerId/storage` | `MRestAPI.ManagerParams` | `MRestAPI.StoreClearResponse` |

### hub

| Method | Path | In | Out |
| --- | --- | --- | --- |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/load-check` | `STHRestAPI.HubParams` | `STHRestAPI.GetLoadCheckResponse` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/version` | `STHRestAPI.HubParams` | `STHRestAPI.GetVersionResponse` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/config` | `STHRestAPI.HubParams` | `STHRestAPI.GetConfigResponse` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/status` | `STHRestAPI.HubParams` | `STHRestAPI.GetStatusResponse` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/audit` | `STHRestAPI.HubParams` | `ReadableStream<AuditRecord>` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/sequences` | `STHRestAPI.HubParams` | `STHRestAPI.GetSequencesResponse` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances` | `STHRestAPI.HubParams` | `STHRestAPI.GetInstancesResponse` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/entities` | `STHRestAPI.HubParams` | `STHRestAPI.GetEntitiesResponse` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/logs` | `STHRestAPI.HubParams` | `ReadableStream<LogRecord>` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/topics` | `STHRestAPI.HubParams` | `STHRestAPI.GetTopicsResponse` |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/topics` | `TopicPostPayload` | `OpResponse<TopicPostResponse>` |
| DELETE | `/api/v2/managers/:managerId/hubs/:hubId/topics/:topic` | `TopicDeletePayload` | `OpResponse<TopicDeleteResponse>` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/topics/:topic/stream` | `TopicStreamPayload` | `ReadableStream<TopicChunk>` |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/topics/:topic/stream` | `TopicStreamPayload` | `OpResponse<Record<string, unknown>>` |

### seq

| Method | Path | In | Out |
| --- | --- | --- | --- |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/sequences` | `STHRestAPI.SendSequencePayload` | `OpResponse<STHRestAPI.SendSequenceResponse>` |
| PUT | `/api/v2/managers/:managerId/hubs/:hubId/sequences/:sequenceId` | `STHRestAPI.SendSequencePayload` | `OpResponse<STHRestAPI.SendSequenceResponse>` |
| DELETE | `/api/v2/managers/:managerId/hubs/:hubId/sequences/:sequenceId` | `STHRestAPI.DeleteSequencePayload` | `OpResponse<STHRestAPI.DeleteSequenceResponse>` |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/sequences/:sequenceId/instances` | `STHRestAPI.StartSequencePayload` | `OpResponse<STHRestAPI.StartSequenceResponse>` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/sequences/:sequenceId` | `STHRestAPI.GetSequencePayload` | `STHRestAPI.GetSequenceResponse` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/sequences/:sequenceId/instances` | `STHRestAPI.GetSequenceInstancesPayload` | `STHRestAPI.GetSequenceInstancesResponse` |

### inst

| Method | Path | In | Out |
| --- | --- | --- | --- |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId` | `STHRestAPI.GetInstancePayload` | `STHRestAPI.GetInstanceResponse` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/stdout` | `STHRestAPI.InstanceStreamPayload` | `ReadableStream<Buffer>` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/stderr` | `STHRestAPI.InstanceStreamPayload` | `ReadableStream<Buffer>` |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/stdin` | `STHRestAPI.InstanceStreamPayload` | `OpResponse<Record<string, unknown>>` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/logs` | `STHRestAPI.InstanceStreamPayload` | `ReadableStream<LogRecord>` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/monitoring` | `STHRestAPI.InstanceStreamPayload` | `ReadableStream<MonitoringMessage>` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/output` | `STHRestAPI.InstanceStreamPayload` | `ReadableStream<Buffer>` |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/input` | `STHRestAPI.InstanceStreamPayload` | `OpResponse<Record<string, unknown>>` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/health` | `STHRestAPI.GetHealthPayload` | `RunnerMessageCode.MONITORING` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/events/:name/stream` | `STHRestAPI.GetEventPayload` | `ReadableStream<EventMessageData>` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/events/:name` | `STHRestAPI.GetEventPayload` | `STHRestAPI.GetEventResponse` |
| GET | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/events/:name/once` | `STHRestAPI.GetEventPayload` | `STHRestAPI.GetNextEventResponse` |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/monitoring-rate` | `MonitoringRateMessage` | `OpResponse<Record<string, unknown>>` |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/events` | `EventMessage` | `OpResponse<STHRestAPI.SendEventResponse>` |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/stop` | `STHRestAPI.StopInstancePayload` | `OpResponse<STHRestAPI.SendStopInstanceResponse>` |
| POST | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/kill` | `STHRestAPI.KillInstancePayload` | `OpResponse<STHRestAPI.SendKillInstanceResponse>` |
| PATCH | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId` | `SetSequenceMessage` | `OpResponse<Record<string, unknown>>` |

### rpc

| Method | Path | In | Out |
| --- | --- | --- | --- |
| ANY | `/api/v2/managers/:managerId/hubs/:hubId/instances/:instanceId/rpc/*` | `HttpRequest` | `HttpResponse` |
| ANY | `/api/v2/managers/:managerId/hubs/:hubId/rpc/*` | `HttpRequest` | `HttpResponse` |

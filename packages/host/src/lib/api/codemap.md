# packages/host/src/lib/api/

## Responsibility

Host API handler modules that register v1 and v2 REST routes on the host's `APIExpose` surface. These translate between route contracts (from `@scramjet/rest-api2` and `@scramjet/api-router`) and the host runtime's internal controllers, stores, and service discovery.

## Modules

### `host-api.ts` — `HostAPIHandler` (31 lines)

Composite handler that instantiates and attaches both v1 and v2 handlers:
- `HostAPIV1Handler` for legacy v1 REST endpoints (sequence/instance CRUD, RPC, platform, audit).
- `HostAPIV2Handler` for v2 REST endpoints (hub routes, sequence routes, instance resolver).

Re-exports `matchesRpcExposePath`, `normalizeRpcForwardPath`, `stripRpcExposePath` from v1 handler.

### `host-api-v1.ts` — `HostAPIV1Handler` (535 lines)

Legacy v1 REST API. Key responsibilities:
- **Sequence lifecycle**: `POST sequence` (upload), `PUT sequence/:id` (update), `DELETE sequence/:id`, `POST sequence/:id/start`.
- **Instance proxies**: Installs a middleware at `/api/v1/instance/:id` that resolves the instance from `instancesStore` and delegates to its v1 `router`.
- **RPC middleware**: Routes `/api/v1/rpc` requests to the correct instance's RPC forwarder.
- **CPM/space proxy**: Forwards `/api/v1/cpm/*` requests to the connected Manager via `cpmConnector`.
- **Audit, log, topic**: Registers upstream/downstream handlers for audit, log, and topic streams.
- **V1 compatibility router**: `createV1CompatibilityRouter()` re-exports `/version`, `/config`, `/status` from v2 handler with v1-wrapped responses.

### `host-api-v2.ts` — `HostAPIV2Handler` (335 lines)

V2 REST API using `@scramjet/api-router` contracts and `@scramjet/rest-api2` route sets.

- **`createHubRouter()`**: Binds `RestAPI2RouteSets.hub.hubRoutes()` to host runtime methods:
  - `load`, `version`, `config`, `health`, `status`, `sequences`, `instances`, `entities`, `topics`, `logs`, `audit`.
  - Topic CRUD (`createTopic`, `deleteTopic`, `topicRead`, `topicWrite`) backed by `serviceDiscovery`.
- **`createSequenceRouter()`**: Binds `RestAPI2RouteSets.hub.sequenceRoutes()`:
  - `sendSequence`/`updateSequence` → contract-only (delegated to v1 compatibility).
  - `deleteSequence`, `startSequence`, `getSequence`, `getSequenceInstances`.
- **`createV2Router()`**: Composes hub + sequence routers and adds an `instance` resolver that looks up `instancesStore.getByNameOrId()` and returns the instance's `v2Router` as a `local` target.
- **Route metadata**: v2 handlers return local/direct-route metadata used by Manager and MultiManager forwarding layers to decide whether to follow, redirect, or proxy a route.
- **`attach()`**: Calls `registerHttpRoutes()` to wire the composed v2 router onto the host API surface.

### `instance-api.ts` — `InstanceAPI` (246 lines)

Legacy v1 instance REST API attached to each instance's `APIRoute`. Key handlers:
- `GET /` → info, `GET /health`, `GET /stdout`, `GET /stderr`, `PUT /stdin`
- `GET /log`, `GET /output`, `GET /monitoring`, `PUT /input`
- `POST /_stop`, `POST /_kill`, `POST /_event`, `POST /_monitoring_rate`
- `GET /events/:name`, `GET /event/:name`, `GET /once/:name`
- RPC middleware at `/rpc` → `forwardRpcRequest`

### `instance-api-v2.ts` — `InstanceAPIV2` (199 lines)

V2 REST API for individual instances using `@scramjet/api-router` contracts:
- Binds `RestAPI2RouteSets.instance.routes()` to `ICSI` controller methods:
  - `info`, `deleteInstance`, `patchInstance`, `stdio`, `health`, `output`, `logs`, `monitoring`
  - `stdioRead`, `input`, `stdioWrite`, `getEvent`, `getNextEvent`, `sendEvent`
  - `rpc` → contract-only (delegated to v1).
- All responses use `RestAPI2` envelope types (`OpResponse`, `InstanceResponse`, etc.).

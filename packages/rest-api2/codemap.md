# Package Atlas: rest-api2

## Responsibility

`@scramjet/rest-api2` owns v2 REST API public contracts and the single common v2 client used across MultiManager, Manager, Host, Sequence, Instance/CSI, audit, stdio, and RPC surfaces. Defines the Root → Space → Hub → Instance route tree as the source of truth. Provides fluent typed client builders for each tree node.

## Design / Patterns

- **`RestAPI2` namespace** (`contracts.ts`): Public DTO types for all v2 API responses and request payloads — `Root`, `Space`, `Hub`, `Sequence`, `Instance`, `Topic`, `Entity`, `HealthCheckInfo`, `OpResponse`, `ListResponse`, `TrustExport`, `DeleteHubQuery/Response`, `StoreItem`, `StoreClearResponse`, `ClientRequest`, `ClientResponse`, `ClientTransport`, `Client`, `RouteOwnership`, `ForwardingResolution`, etc.
- **Zod schemas** (`schemas.ts`): Runtime validation schemas mirroring all DTOs, plus param/query/header/body schemas for route definitions. Includes factory functions: `opResponse()`, `listResponse()`, `healthComponent()`, `healthCheckInfo()`. Provides `RestAPI2Schemas` as a flat namespace for route definition composition. Includes coerce-based fd param schemas (`readableFdParam`, `writableFdParam`, `anyFdParam`).
- **Route tree as source of truth** (`routes.ts`): `RestAPI2RouteTree` defines the hierarchical route structure:
  - `root` → `/api/v2` (version, info, load, spaces, health, trust/:id?, audit)
    - resolver: `space` → `/spaces/:spaceId`
  - `space` → version, config, trust, load, health, list/hubs, instances, sequences, all_sequences, entities, topics, topicInfo, topicRead, topicWrite, logs, audit, deleteHub, storageSequences, storageObjectRead/Write/Delete, storageClear
    - resolver: `hub` → `/hubs/:hubId`
  - `hub` → load, version, config, health, status, sequences, instances, entities, topics, createTopic, deleteTopic, topicRead, topicWrite, logs, audit
    - groups: `sequence` (send, update, delete, start, get, getInstances), `topics`, `logs`, `audit`
    - resolver: `instance` → `/instances/:instanceId`
  - `sequence` → send, update, delete, start, get, getInstances
  - `instance` → info, delete, patch, stdio, health, output, logs, monitoring, stdioRead, input, stdioWrite, getEvent, getNextEvent, sendEvent, rpc (opaque)
    - groups: `stdio`, `events`, `rpc` (opaque), `logs`, `monitoring`
- **Derived exports**: `RestAPI2RouteSets` (route/resolver sets per tree node) and `RestAPI2Routes` (pre-built `RouterDefinition` factories per node).
- **Fluent client builder** (`client.ts`): Builds typed fluent clients (`RootClient`, `SpaceClient`, `HubClient`, `InstanceClient`) over `@scramjet/api-router` transports and manifests. Supports `createFluentClientFromRouteTreeNode()` for custom tree nodes. Uses `getOpaqueRouteKeys()` to exclude opaque routes (e.g., RPC) from standard client surface.

## Integration Points

- Uses `@scramjet/api-router` for route definitions, manifests, router factories, client transports, and schema-mode/OpenAPI integration.
- Consumed by Host (`host-api-v2.ts`), Manager (`manager-api-v2.ts`), and MultiManager (`multi-manager-api-v2.ts`) for v2 handler binding and route manifests.
- Publicly exported through `src/index.ts` as the v2 contract/client package surface.

# packages/api-client/src/

## Responsibility

Source files for the `@scramjet/api-client` package: typed HTTP API clients for STH Host, Instance, Sequence, and Manager REST endpoints. Both v1 and v2 API surfaces.

## Files

| File | Role |
|------|------|
| `index.ts` | Barrel export — re-exports `HostClient`, `createHostClient`, `InstanceClient`, `SequenceClient`, and all `ManagerClient` exports. |
| `host-client.ts` | `HostClient` class (315 lines). v1 methods: `listSequences`, `listInstances`, `listEntities`, `sendSequence`, `getSequence`, `deleteSequence`, `getInstanceInfo`, `getLoadCheck`, `getVersion`, `sendTopic`/`getTopic`, `createTopic`/`deleteTopic`/`getTopics`, `getInstanceClient`, `getSequenceClient`, `getManagerClient`. v2 methods: `getStatus()`, `getConfig()` via `#_v2Client` with response unwrapping. |
| `instance-client.ts` | `InstanceClient` class (225 lines). Methods: `stop`, `kill`, `sendEvent`, `getNextEvent`, `getEvent`, `getEventStream`, `getHealth`, `getRPCClient`, `getInfo`, `getStream`, `sendStream`, `sendInput`, `inout`, `sendStdin`, `getLogStream`. |
| `sequence-client.ts` | `SequenceClient` class (105 lines). Methods: `start`, `listInstances`, `getInstance`, `getInfo`, `overwrite`. |
| `manager-client.ts` | `ManagerClient` class (156 lines). Methods: `getHostClient` (proxied), `getHosts`, `listHostsWithFilter`, `getVersion`, `getLoad`, `sendNamedData`, `getNamedData`, `getLogStream`, `getAuditStream`, `getConfig` (v2), `getAllSequences` (v2), `getSequences` (v2), `getInstances` (v2), `getTopics`, `getStoreItems`, `putStoreItem`, `deleteStoreItem`, `clearStore`, `disconnectHubs`, `deleteHub`. |
| `definitions.d.ts` | Type augmentation reference file. |

## Key Patterns

- Dual client instances: `#_client` (v1) and `#_v2Client` (v2, auto-derived) in both `HostClient` and `ManagerClient`.
- v2 response unwrapping: methods detect `{items: ...}` or `{config: ...}` envelope and extract inner payload.
- Proxied host client: `ManagerClient.getHostClient()` creates a `HostClient` with API base pointing through the Manager's STH proxy.

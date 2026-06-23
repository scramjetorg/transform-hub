# packages/types/src/manager/

## Files

| File | Lines | Role |
|------|-------|------|
| `index.ts` | 4 | Barrel re-export of all manager type modules. |
| `service-discovery.ts` | 34 | `IServiceDiscovery`, `ITopicActor`, `Topic`, `ActorStreamType` — topic-based service discovery interfaces for Manager/STH communication. |
| `service-discovery-symbols.ts` | 9 | `ActorType` (HOST, API) and `ActorRole` (PROVIDER, CONSUMER) enums. |
| `sth-connection-store.ts` | 77 | `ISTHController`, `ISTHConnectionStore`, `STHControllerEvents`, `DisconnectReason`, `SthConnectionStoreErrors` — STH connection lifecycle and registry typed contracts. `ISTHController` includes `id`, `description`, `tags`, `info` (created/lastConnected/lastDisconnected), `accessKey`, `routeDomain`, `healthy`, `disconnectReason`, `isConnectionActive`, `selfHosted`, `networkInterfaces`, `logger`, log/audit streams, `init`, `reconnect`, `getInfo`, `getLoadStat`, topic creation, disconnect, dispose. |
| `sth-info-register.ts` | 27 | `ISTHInfoRegister` — hub/sequence/instance tracking per connected STH host (`addHub`/`removeHub`, `addSequence`/`deleteSequence`, `addInstance`/`deleteInstance`, `getHubs`, `getSequences`, `getInstances`, `clearHostEntities`, `handleHubDisconnect`). |

## Responsibility

Manager-facing type contracts for STH connection lifecycle, service discovery, topic-based actor registration, and host/sequence/instance info tracking. `STHControllerEvents` provides a typed event emitter interface (`disconnected`, `topic`, `sequence`, `instance`, `event`). `DisconnectReason` covers `"key_revoked" | "limit_exceeded" | "id_drop" | "disconnected"`.

## Integration Points

- Consumed by `@scramjet/manager`, `@scramjet/multi-manager`, and other Manager-side packages.
- References core types from `@scramjet/types` index (`IObjectLogger`, `ReadableStream`, `WritableStream`, `Instance`, `SequenceInfo`, etc.).

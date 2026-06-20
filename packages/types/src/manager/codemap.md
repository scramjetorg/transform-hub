# packages/types/src/manager/

## Files

| File | Lines | Role |
|------|-------|------|
| `index.ts` | 4 | Barrel re-export of all manager type modules. |
| `service-discovery.ts` | 34 | `IServiceDiscovery`, `ITopicActor`, `Topic`, `ActorStreamType` — topic-based service discovery interfaces for Manager/S TH communication. |
| `service-discovery-symbols.ts` | 9 | `ActorType` (HOST, API) and `ActorRole` (PROVIDER, CONSUMER) enums. |
| `sth-connection-store.ts` | 77 | `ISTHController`, `ISTHConnectionStore`, `STHControllerEvents`, `DisconnectReason`, `SthConnectionStoreErrors` — STH connection lifecycle and registry typed contracts. |
| `sth-info-register.ts` | 27 | `ISTHInfoRegister` — hub/sequence/instance tracking per connected STH host. |

## Responsibility

Manager-facing type contracts for STH connection lifecycle, service discovery, topic-based actor registration, and host/sequence/instance info tracking.

## Integration Points

- Consumed by `@scramjet/manager`, `@scramjet/multi-manager`, and other Manager-side packages.
- References core types from `@scramjet/types` index (`IObjectLogger`, `ReadableStream`, `WritableStream`, `Instance`, `SequenceInfo`, etc.).

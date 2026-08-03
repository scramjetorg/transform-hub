# packages/host/src/lib/types/

## Responsibility

TypeScript type definitions for the Host package's internal domain abstractions. Defines the interfaces for the Host orchestrator, the CSI (Controller Service Interface) for instance lifecycle, and the instance/sequence store contracts.

## Modules

### `index.ts` — Barrel export (3 lines)

Re-exports all types from `host.ts` and `csi.ts`.

### `host.ts` — `IHost` interface

Defines the `IHost` interface that the Host implementation exposes to API handlers and external consumers. Key members:
- `apiBase`, `instanceBase` — URL prefix configuration.
- `apiVersion`, `service`, `version`, `build`, `publicConfig` — Metadata.
- `loadCheck` — Resource load monitoring.
- `sequenceStore`, `instancesStore` — Sequence and instance registries.
- `serviceDiscovery` — Topic-based pub/sub.
- `auditor`, `commonLogsPipe`, `heartBeatInterval` — Logging/audit infrastructure.
- `cpmConnector` — Optional Manager connectivity.
- `runnerVerser2UpstreamHealth` — Verser2 runner health status.
- `addSequence()`, `deleteSequence()`, `startSequence()` — Sequence lifecycle.
- `getSequence()`, `getSequences()`, `getSequenceInstances()` — Query methods.
- `getInstance()`, `getInstances()` — Instance query.
- `getStatus()`, `getCpuUsage()` — Runtime state.

### `csi.ts` — `ICSI` interface

Defines the Controller Service Interface for a single instance (Sequence Instance):
- `id`, `status` — Identity and lifecycle state.
- `isRunning`, `apiInputEnabled` — Runtime state booleans.
- `getInfo()` — Returns instance metadata.
- `getOutputStream()`, `getLogStream()`, `getMonitoringStream()` — Data streams.
- `getStdio()` — Array of `[stdin, stdout, stderr]` streams.
- `getInput(contentType)` — Writable input stream.
- `stop()`, `kill()`, `set()` — Lifecycle mutations.
- `emitEvent()`, `awaitEvent()` — Event system.
- `forwardRpcRequest()` — RPC forwarding.
- `v2Router` — Optional `LocalRouterTarget` for v2 API delegation.

### `instance-store.ts` — Instance store types

Types for the instance registry including instance metadata shapes, store query interfaces, and store event types.

### `sequence-store.ts` — Sequence store types

Types for the sequence registry including sequence metadata shapes, store query interfaces, and store event types.

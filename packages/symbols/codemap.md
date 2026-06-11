# packages/symbols/

## Responsibility

Central shared constants package for runtime/message protocol symbols, stream states, status enums, exit/error codes, and transport headers used across runner, host, API, and adapter layers.

## Design/Patterns

Pure enum/constant surface with a small set of domain-specific namespaces (`RunnerMessageCode`, `CPMMessageCode`, `CommunicationChannel`, `RunnerExitCode`, `InstanceStatus`, etc.).
Runtime kind resolution is centralized in `runtime-kind.ts` with the explicit fallback/preference rule (`node` > `bun` > `python3`, default to `node`).

## Data & Control Flow

The package defines the canonical protocol vocabulary used by control, monitoring, CPManager, and API message contracts. Runtime and host components consume these codes to classify lifecycle transitions, monitoring frames, storage events, and audit records consistently.

`CommunicationChannel` constants also define the fd/channel mapping language for host/runner wire-up, while state enums (`WorkState`, `ReadableState`, `WritableState`, `StreamType`) model stream lifecycle in runtime-host interactions.

## Integration Points

Consumed by `@scramjet/types`, `@scramjet/host`, `@scramjet/runner`, `@scramjet/runner-node/runner-bun/runner-python`, API/server, adapters (`adapters-common`, docker/kubernetes/process), and `api-client`/`host-client`/`csi` consumers.

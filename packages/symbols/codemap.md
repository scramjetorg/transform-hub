# packages/symbols/

## Responsibility

Central shared constants package for runtime/message protocol symbols, stream states, status enums, exit/error codes, transport headers, and runtime-kind resolution used across runner, host, API, and adapter layers.

## Design/Patterns

Pure enum/constant surface with a small set of domain-specific namespaces (`RunnerMessageCode`, `CPMMessageCode`, `CommunicationChannel`, `RunnerExitCode`, `InstanceStatus`, `APIErrorCode`, etc.).
Runtime kind resolution is centralized in `runtime-kind.ts` with explicit fallback/preference rule (`node` > `bun` > `python3`, default to `node`).

## Data & Control Flow

The package defines the canonical protocol vocabulary used by control, monitoring, CPManager, and API message contracts. Runtime and host components consume these codes to classify lifecycle transitions, monitoring frames, storage events, and audit records consistently.

`CommunicationChannel` constants also define the fd/channel mapping language for host/runner wire-up, while state enums (`WorkState`, `ReadableState`, `WritableState`, `StreamType`) model stream lifecycle in runtime-host interactions.

`HostHeaders` enum (in `headers/host.ts`) defines HTTP header constants like `x-seq-kill-inst`.

## Source Structure

| Path | Exports |
|------|---------|
| `src/index.ts` | Barrel re-export of all modules |
| `src/runtime-kind.ts` | `RuntimeKind` type and `selectRuntimeKind()` function |
| `src/communication-channel.ts` | `CommunicationChannel` enum |
| `src/headers/` | HTTP header constants (`HostHeaders`) |
| `src/*-message-code.ts` | Runner/CPM/Instance/Sequence message code enums |
| `src/*-status.ts` | Instance/sequence status enums |
| `src/*-error-codes.ts` | API/disconnect error codes |
| `src/storage-action-code.ts` | Storage action event codes |
| `src/sd-stream-handler-state.ts` | Stream handler state enum |

## Integration Points

Consumed by `@scramjet/types`, `@scramjet/host`, `@scramjet/runner`, `@scramjet/runner-node/runner-bun/runner-python`, API/server, adapters (`adapters-common`, docker/kubernetes/process), `api-client`/`host-client`/`csi` consumers, and `@scramjet/load-check`.

# @scramjet/model

## Responsibility

Provides the domain model for Scramjet Transform Hub: message serialization/deserialization, stream message handling, error types, and utility classes (ID provider, delayed stream). Forms the communication protocol layer between host, runner, and adapter processes.

## Design / Patterns

- **Message serialization**: `MessageUtilities.serializeMessage` / `deserializeMessage` handles the typed message envelope protocol for runner/host communication.
- **Stream handler**: `StreamHandler` manages bidirectional communication channels — monitoring message handlers, control message handlers, upstream/downstream stream configuration for the runner process protocol.
- **Error hierarchy**: Domain error classes (`AppError`, `HostError`, `RunnerError`, `CSIError`, `InstanceAdapterError`, `SequenceAdapterError`) provide typed error propagation across components.
- **ID generation**: `IDProvider` utility for generating unique identifiers.
- **Delayed stream**: `DelayedStream` buffers stream data until a destination is attached.

## Source Files

| File/Directory | Role |
|----------------|------|
| `stream-handler.ts` | `StreamHandler` — bidirectional message and stream channel handling for runner protocol. |
| `messages-utils.ts` | Message serialization/deserialization utilities. |
| `get-message.ts` | Message extraction helpers. |
| `errors/` | Domain error classes: `AppError`, `CSIError`, `HostError`, `InstanceAdapterError`, `RunnerError`, `SequenceAdapterError`. |
| `utils/id-provider.ts` | `IDProvider` — unique ID generation. |
| `utils/delayed-stream.ts` | `DelayedStream` — buffered stream container. |

## Integration Points

- Depends on `@scramjet/obj-logger`, `@scramjet/symbols`.
- Consumed by host, runner, and adapter packages for communication protocol implementation.
- `StreamHandler` is the primary integration point for runtime wrapper packages (`runner-node`, `runner-bun`, `runner-python`).

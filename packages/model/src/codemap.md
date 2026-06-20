# packages/model/src/

## Files

| File | Lines | Role |
|------|-------|------|
| `index.ts` | 11 | Barrel re-export of all model modules. |
| `stream-handler.ts` | 331 | `StreamHandler` — manages bidirectional messaging and stream channels for the runner process protocol. Handles monitoring/control message dispatch, upstream/downstream stream configuration. |
| `messages-utils.ts` | — | `serializeMessage` / `deserializeMessage` for typed message envelope protocol. |
| `get-message.ts` | — | Message extraction helpers from streams. |

### Sub-directories

| Directory | Contents |
|-----------|----------|
| `errors/` | Domain error classes: `AppError`, `CSIError`, `HostError`, `InstanceAdapterError`, `RunnerError`, `SequenceAdapterError`. |
| `utils/` | `IDProvider` (unique ID generation), `DelayedStream` (buffered stream until attach). |

## Responsibility

Implements the communication protocol layer: typed message serialization, stream-based message dispatch with configurable handlers, error propagation, and utility classes for ID generation and stream buffering.

## Design/Patterns

- `StreamHandler` uses a configured message handler list per message code, with blocking/non-blocking semantics for monitoring and control messages.
- Message handler lists are partitioned by `RunnerMessageCode` and `CPMMessageCode`, with separate handling for `MonitoringMessageCode` and `ControlMessageCode`.
- Error classes extend a common pattern for structured error propagation across process boundaries.

## Integration Points

- Core dependency for `@scramjet/runner` and runtime wrapper packages.
- Message types consumed from `@scramjet/types` and `@scramjet/symbols`.

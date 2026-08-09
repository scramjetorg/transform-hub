# packages/model/src/

## Files

| File | Lines | Role |
|------|-------|------|
| `index.ts` | 11 | Barrel re-export of all model modules plus `MessageUtilities` object. |
| `stream-handler.ts` | 331 | `StreamHandler` — manages bidirectional messaging and stream channels for the runner process protocol. Handles monitoring/control message dispatch, upstream/downstream stream configuration. |
| `messages-utils.ts` | 44 | `serializeMessage` / `deserializeMessage` for typed message envelope protocol. Serialize uses `structuredClone`. Deserialize validates array format and RunnerMessageCode. |
| `get-message.ts` | 100 | Message extraction helpers from streams. `getMessage()` constructs typed messages, `checkMessage()` applies runtime type guards (isStopSequenceMessage, isKeepAliveMessage, isMonitoringRateMessage, isEventMessage, isErrorMessage, isMonitoringMessage, isAcknowledgeMessage, isDescribeSequenceMessage). |

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
- `serializeMessage` uses `structuredClone` for immutable body serialization.

## Integration Points

- Core dependency for `@scramjet/runner` and runtime wrapper packages.
- Message types consumed from `@scramjet/types` and `@scramjet/symbols`.
- `MessageUtilities` convenient export for consumers.

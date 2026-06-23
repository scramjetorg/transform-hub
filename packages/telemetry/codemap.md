# packages/telemetry/

## Responsibility

Telemetry/log forwarding package for Scramjet Transform Hub. Provides a pluggable telemetry adapter system for sending analytics and log data to external backends (e.g., Loki/Grafana).

## Design / Patterns

- **Adapter registry**: `getTelemetryAdapter(name, config)` dynamically loads telemetry adapters by name from a registered map (`loki` → `./adapters/loki`). Extensible for future adapters.
- **ITelemetryAdapter interface**: Standard contract with `push(level, payload)` method and `logger` property. Payload supports `message` string and optional `labels` map.
- **Loki adapter**: Uses `winston` and `winston-loki` transport to forward logs to a Loki/Grafana endpoint. Validates config on construction (requires `host`). Handles connection errors via `onConnectionError` callback.
- **Typed levels**: Supports `debug`, `info`, `warn`, `error` log levels.

## Source Files

| File | Role |
|------|------|
| `src/index.ts` | Exports `getTelemetryAdapter()` factory function and types. |
| `src/types.ts` | `ITelemetryAdapter`, `logLevel`, `TelemetryAdapter` constructor type. |
| `src/adapters/loki.ts` | `LokiAdapter` — concrete adapter sending logs to Loki via winston-loki. |

## Data & Control Flow

- Consumers call `getTelemetryAdapter("loki", config)` to instantiate the Loki adapter.
- Adapter calls `push(level, { message, labels })` to forward log entries.
- Loki adapter validates config, creates a winston logger with Loki transport, and delegates `push()` to winston at the appropriate level.

## Integration Points

- Types from `@scramjet/types` (`TelemetryAdaptersConfig`).
- Depends on `@scramjet/obj-logger` (for adapter-level logging), `winston`, `winston-loki`.
- Used by STH host and Manager processes for telemetry forwarding.

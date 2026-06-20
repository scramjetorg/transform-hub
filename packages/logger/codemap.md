# @scramjet/logger

## Responsibility

Provides a simple, Console Web API-compatible logger with streaming output support. Implements the full `Console` interface for `log`, `info`, `warn`, `error`, `debug`, `dir`, `trace` methods with colorized, timestamped output formatting.

## Design / Patterns

- **Console API compatibility**: `Logger` class implements the Node.js `Console` interface — 100% compatible method signatures for drop-in replacement.
- **Global output registry**: Module-level `loggerOutputs` map tracks `out` and `err` output streams as `LoggerOutputStream[]`. `writeLog` dispatches to all registered streams for the given channel.
- **Stream registration**: `addLoggerOutput` / `removeLoggerOutput` manage output streams with reference counting to prevent duplicates and clean up on disconnect.
- **Colorized formatting**: `defaultFormatMessage` applies ANSI color codes per log function (`info` → cyan, `error` → red, etc.) when the output stream supports color.
- **Object-mode aware**: Non-object-mode streams receive stringified output via `DataStream.stringify` with the formatting pipeline.

## Data & Control Flow

```
getLogger(reference, options) → new Logger
  → Logger.error|warn|info|debug("msg", ...args)
  → writeLog("err"|"out", name, func, ...args)
  → iterate loggerOutputs[streamSpec], write [ts, ...inspectedArgs] to each

addLoggerOutput(out, err)
  → addLoggerStream(out, loggerOutputs.out), addLoggerStream(err, loggerOutputs.err)
  → each stream optionally wrapped in DataStream.stringify pipeline
```

## Integration Points

- Light dependency footprint: only `scramjet` (DataStream) as runtime dependency.
- Used throughout the STH ecosystem as a lightweight alternative to `@scramjet/obj-logger` when Console API compatibility is needed.
- `LoggerOptions` type imported from `@scramjet/types`.

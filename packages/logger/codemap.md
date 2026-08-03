# @scramjet/logger

## Responsibility

Provides a simple, Console Web API-compatible logger with streaming output support. Implements the full `Console` interface for `log`, `info`, `warn`, `error`, `debug`, `dir`, `trace` methods with colorized, timestamped output formatting.

## Design / Patterns

- **Console API compatibility**: `Logger` class implements the Node.js `Console` interface — 100% compatible method signatures for drop-in replacement.
- **Name derivation**: `getName()` extracts logger name from constructor, class, or string reference. Appends optional `:id` suffix when the reference has an `id` property. Replaces newlines and whitespace with `:`.
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

## Source Files

| File | Lines | Role |
|------|-------|------|
| `src/index.ts` | 229 | `Logger` class, `getLogger` factory, `addLoggerOutput`/`removeLoggerOutput`, `defaultFormatMessage` |
| `src/lib/colors.ts` | 12 | Terminal color constants |
| `src/lib/get-name.ts` | 33 | `getName()` — derives logger name from reference (constructor, class instance, or string) with optional `:id` suffix |

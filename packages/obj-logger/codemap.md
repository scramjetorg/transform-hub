# @scramjet/obj-logger

## Responsibility

Provides an object-mode structured logger with pipeable stream output, log level control, and multi-target support. Unlike `@scramjet/logger` (Console API compatible), `ObjLogger` works in object mode — log entries are JavaScript objects that can be piped through transform streams and consumed programmatically.

## Design / Patterns

- **Object-mode logging**: Log entries are structured `LogEntry` objects with `level`, `ts`, `msg`, `data`, `from` fields, enabling downstream stream processing.
- **Log level fallthrough**: Log levels (`TRACE` → `DEBUG` → `INFO` → `WARN` → `ERROR` → `FATAL`) cascade — setting a level replaces method implementations on the instance with appropriate no-ops or real methods, avoiding runtime level checks on every log call.
- **Stream plumbing**: Multiple internal PassThrough streams (`outputLogStream`, `inputLogStream`, `inputStringifiedLogStream`, `output`) enable flexible pipe topologies, including separate object and stringified input paths.
- **Source aggregation**: `addObjectLoggerSource` / `addSerializedLoggerSource` allows merging logs from subordinate loggers or serialized log streams.
- **Pipe/unpipe pattern**: `pipe(target)` supports both `Writable` targets and other `ObjLogger` instances (as hierarchical log targets). `unpipe(target, options)` reverses the connection with optional stringified mode.
- **Pretty-print**: `utils/pretty-print` exports `prettyPrint` for human-readable log output formatting with colorized level, timestamp, source, and data.
- **JSON streams**: `utils/streams` exports `JSONParserStream` and `JSONStringifierStream` transform streams for log serialization/deserialization.
- **Name derivation**: `getName()` extracts logger name from constructor, class instance, or string reference (simplified — no `:id` suffix, class name directly from proto).

## Data & Control Flow

```
new ObjLogger(reference, baseLog, logLevel)
  → getName(reference) → this.name (from constructor.name, class name, or string)
  → logLevel setter → enables/disables level methods via fallthrough
  → .info|error|warn|debug|fatal|trace(entry, ...params)
    → this.write(level, entry, ...params)
    → constructs LogEntry with ts, level, from, msg, data
    → writes to this.outputLogStream and all this.outputs[]
  → .pipe(target) → connects output stream to target (ObjLogger or Writable)
```

## Integration Points

- Used extensively across the STH codebase as the primary structured logger.
- Depends on `@scramjet/utility` (for `LogLevelStrings`) and `scramjet` (for stream transforms).
- `IObjectLogger` interface defined in `@scramjet/types`.
- LogLevel type from `@scramjet/utility` (re-exported as `LogLevelStrings`).

## Source Files

| File | Lines | Role |
|------|-------|------|
| `src/index.ts` | 2 | Barrel re-export of `obj-logger` and `pretty-print`. |
| `src/obj-logger.ts` | 334 | `ObjLogger` class — object-mode structured logger with stream plumbing, log level fallthrough, multi-target output, source aggregation, pipe/unpipe. |
| `src/utils/get-name.ts` | 31 | Derives a logger name from a reference (constructor, class instance, or string). |
| `src/utils/pretty-print.ts` | 27 | `prettyPrint` function for human-readable log output formatting. |
| `src/utils/streams.ts` | 62 | `JSONParserStream` and `JSONStringifierStream` transform streams for log serialization. |
| `src/utils/colors.ts` | 12 | Terminal ANSI color constants. |

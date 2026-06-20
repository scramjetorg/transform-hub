# @scramjet/obj-logger

## Responsibility

Provides an object-mode structured logger with pipeable stream output, log level control, and multi-target support. Unlike `@scramjet/logger` (Console API compatible), `ObjLogger` works in object mode — log entries are JavaScript objects that can be piped through transform streams and consumed programmatically.

## Design / Patterns

- **Object-mode logging**: Log entries are structured `LogEntry` objects with `level`, `ts`, `msg`, `data`, `from` fields, enabling downstream stream processing.
- **Log level fallthrough**: Log levels (`TRACE` → `DEBUG` → `INFO` → `WARN` → `ERROR` → `FATAL`) cascade — setting a level enables all higher-severity levels by replacing method implementations with appropriate no-ops or real methods.
- **Stream plumbing**: Multiple internal PassThrough streams (`outputLogStream`, `inputLogStream`, `inputStringifiedLogStream`, `output`) enable flexible pipe topologies.
- **Source aggregation**: `addObjectLoggerSource` / `addSerializedLoggerSource` allows merging logs from subordinate loggers or serialized log streams.
- **Pipe/unpipe pattern**: `pipe(target)` supports both `Writable` targets and other `ObjLogger` instances (as hierarchical log targets). `unpipe()` reverses the connection.
- **Pretty-print**: `utils/pretty-print` exports `prettyPrint` for human-readable log output formatting.

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

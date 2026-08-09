# packages/obj-logger/src/

## Files

| File | Lines | Role |
|------|-------|------|
| `index.ts` | 2 | Barrel re-export of `obj-logger` and `pretty-print`. |
| `obj-logger.ts` | 334 | `ObjLogger` class — object-mode structured logger with stream plumbing, log level control via method fallthrough, multi-target output, and source aggregation. Supports `pipe()` and `unpipe()` with stringified option. |
| `utils/pretty-print.ts` | 27 | `prettyPrint` function for human-readable log output formatting with colorized level, timestamp, source, and data. |
| `utils/get-name.ts` | 31 | Derives a logger name from a reference (constructor, class instance, or string). Simplified — no `:id` suffix, uses class name directly from prototype. |
| `utils/streams.ts` | 62 | `JSONParserStream` and `JSONStringifierStream` transform streams for log serialization/deserialization. |
| `utils/colors.ts` | 12 | Terminal ANSI color constants. |

## Responsibility

Implements the object-mode structured logger: log entry construction, level-based filtering via method fallthrough, stream-based output distribution, hierarchical logger piping, and serialized/deserialized stream source aggregation.

## Design/Patterns

- `ObjLogger` uses a fallthrough pattern for log levels: setting the level replaces method implementations on the instance, avoiding runtime level checks on every log call.
- Internal stream architecture separates input (object + stringified) from output distribution, enabling flexible piping topologies.
- Circular reference handling in `JSON.stringify` via `getCircularReplacer` with WeakSet tracking.
- `stringifiedOutput` getter lazily creates a JSON-stringified pipeline.
- `unpipe()` supports optional target and `stringified` option for selective disconnection.

## Integration Points

- Core logging infrastructure consumed by nearly every STH package.
- `IObjectLogger` interface from `@scramjet/types`.
- `LogLevelStrings` and `LogLevel` from `@scramjet/utility`.

# packages/obj-logger/src/

## Files

| File | Lines | Role |
|------|-------|------|
| `index.ts` | 2 | Barrel re-export of `obj-logger` and `pretty-print`. |
| `obj-logger.ts` | 342 | `ObjLogger` class — object-mode structured logger with stream plumbing, log level control, multi-target output, and source aggregation. |
| `utils/pretty-print.ts` | — | `prettyPrint` function for human-readable log output formatting. |
| `utils/get-name.ts` | — | Derives a logger name from a reference (constructor, class instance, or string). |
| `utils/streams.ts` | — | `JSONParserStream` and `JSONStringifierStream` transform streams for log serialization. |

## Responsibility

Implements the object-mode structured logger: log entry construction, level-based filtering via method fallthrough, stream-based output distribution, hierarchical logger piping, and serialized/deserialized stream source aggregation.

## Design/Patterns

- `ObjLogger` uses a fallthrough pattern for log levels: setting the level replaces method implementations on the instance, avoiding runtime level checks on every log call.
- Internal stream architecture separates input (object + stringified) from output distribution, enabling flexible piping topologies.
- Circular reference handling in `JSON.stringify` via `getCircularReplacer` with WeakSet tracking.

## Integration Points

- Core logging infrastructure consumed by nearly every STH package.
- `IObjectLogger` interface from `@scramjet/types`.
- `LogLevelStrings` and `LogLevel` from `@scramjet/utility`.

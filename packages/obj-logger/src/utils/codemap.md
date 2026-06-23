# packages/obj-logger/src/utils/

## Responsibility

Utility modules supporting the `ObjLogger` class: name derivation, human-readable output formatting, JSON stream transforms, and terminal color constants.

## Modules

### `get-name.ts` (31 lines)
Provides `getName(item)` — derives a human-readable logger name from any reference:
- **String**: returned directly.
- **Function with prototype**: prefixed with `class:`.
- **Object with `.name` property**: prefixed with its type.
- **Object with prototype constructor**: returns `ClassName` (simplified — no type prefix for protos).
- **Fallback**: `"logger"`.
- Strips newlines and collapses whitespace into `:`.

Note: Unlike `@scramjet/logger`'s `getName()`, this version does NOT append `:id` suffix from `item.id`.

### `pretty-print.ts` (27 lines)
`prettyPrint(opts)` returns a mapping function for `LogEntry → string`:
- `opts.colors = true`: colorized output with level colors (TRACE→Dim, DEBUG→Blue, INFO→Cyan, WARN→Yellow, ERROR→Red, FATAL→Magenta), timestamp in dim, source in magenta, ID in cyan on black background, data in dim with `inspect()`.
- `opts.colors = false`: plain text output with same structure.

### `streams.ts` (62 lines)
Transform streams for JSON serialization/deserialization:
- **`JSONParserStream`**: `Transform` (writable string mode, readable object mode). Accumulates partial chunks, splits on newlines, parses each line with configurable parser (default `JSON.parse`). Emits `error` on parse failure.
- **`JSONStringifierStream`**: `Transform` (writable object mode, readable string mode). Stringifies each object with configurable stringifier (default `JSON.stringify`). Emits `error` on stringify failure.

### `colors.ts` (12 lines)
Terminal ANSI color escape constants. Exports `COLORS` enum matching the `@scramjet/logger` color conventions.

## Integration Points

- `getName()` is imported by `obj-logger.ts` for logger name resolution.
- `prettyPrint()` is re-exported at package level and used by MultiManager and other packages for human-readable log output.
- `JSONParserStream`/`JSONStringifierStream` are used internally by `ObjLogger` for stringified input/output pipeline.
- `colors.ts` is used by `pretty-print.ts` for colorized formatting.

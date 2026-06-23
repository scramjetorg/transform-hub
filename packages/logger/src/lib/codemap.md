# packages/logger/src/lib/

## Responsibility

Helper modules for the `@scramjet/logger` package: color constants and name derivation.

## Modules

### `colors.ts` (12 lines)
Terminal ANSI color escape constants. Exports `COLORS` enum with foreground, background, and style codes (Reset, Bright, Dim, FgRed, FgGreen, etc.).

### `get-name.ts` (33 lines)
Provides `getName(item)` — derives a human-readable logger name from any reference:
- **String**: returned directly.
- **Function with prototype**: prefixed with `class:`.
- **Object with `.name` property**: prefixed with its type (e.g., `object:MyClass`, `function:myFunc`).
- **Object with prototype constructor**: prefixed with `object:ClassName`.
- **Fallback**: `"logger"` if none of the above match.
- Appends `:id` suffix if the item has an `id` property (e.g., `object:STHController:cpm-sth-1`).
- Strips newlines and collapses whitespace into `:`.

## Integration Points

- `getName()` is the single import consumed by `logger/src/index.ts` for `Logger` constructor name resolution.
- `colors.ts` is used by `index.ts` for colorized log formatting.

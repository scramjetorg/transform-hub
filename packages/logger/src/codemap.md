# packages/logger/src/

## Files

| File | Lines | Role |
|------|-------|------|
| `index.ts` | 229 | `Logger` class implementing Node.js `Console` interface. `getLogger()` factory. `addLoggerOutput()` / `removeLoggerOutput()` for stream registration with reference counting. `defaultFormatMessage()` for colorized, timestamped formatting. |
| `lib/colors.ts` | 12 | ANSI color constants for terminal output. |
| `lib/get-name.ts` | 33 | `getName()` — derives a human-readable name from any reference (constructor function, class instance, or string). Appends `:id` suffix if reference has an `id` property. |

## Responsibility

Implements a Console API-compatible logger with streaming output, colorized formatting, and global output stream registry. Name derivation supports id-based differentiation.

## Design/Patterns

- Console-API compatible surface (log, info, warn, error, debug, dir, trace).
- Global output registry with reference counting.
- Object-mode aware stream piping via `DataStream.stringify`.

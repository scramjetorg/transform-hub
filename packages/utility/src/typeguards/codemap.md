# packages/utility/src/typeguards/

## Files

| File | Role |
|------|------|
| `index.ts` | Barrel re-export of all type guard functions (11 exports). |
| `is-defined.ts` | `isDefined(value)` — checks value is not null/undefined with `value is T` predicate. |
| `is-boolean.ts` | `isBoolean(value)` — checks value is a boolean. |
| `is-empty-string.ts` | `isEmptyString(value)` — checks value is empty string `""`. |
| `is-api-version.ts` | `isApiVersion(value)` — validates API version string format (`v1`, `v2.13`, `v3.333.111`). |
| `is-id-string.ts` | `isIdString(value)` — validates STH ID string format (alphanumeric + `_-`, max 50 chars). |
| `is-port.ts` | `isPort(value)` — validates TCP port number (0–65535, accepts string/number). |
| `is-url-path.ts` | `isUrlPath(value)` — validates URL path/slug format. |
| `is-http-url.ts` | `isHttpUrl(value)` — validates HTTP/HTTPS URL via `new URL()`. |
| `is-log-level.ts` | `isLogLevel(value)` — validates log level string against `LogLevelStrings`. |
| `dto/` | DTO-specific type guard functions (separate codemap). |

## Responsibility

Provides runtime type-checking (type guard) functions used for validating values against expected types and formats throughout the STH codebase. Each guard is a standalone function for tree-shaking and direct import.

## Design/Patterns

- Each guard is a plain function returning `value is T` type predicate.
- Importable individually or via barrel from `index.ts`.
- DTO guards in `dto/` subdirectory check full DTO shapes at runtime.

## Integration Points

- Consumed across the codebase for input validation and type narrowing.
- DTO guards used by API and adapter layers for request/response validation.

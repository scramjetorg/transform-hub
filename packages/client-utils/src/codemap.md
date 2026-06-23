# packages/client-utils/src/

## Responsibility

Source implementation for base HTTP client utilities. Provides `ClientUtilsBase`, Node.js and browser client variants, error handling classes, and type definitions for the STH API client stack.

## Modules

| File | Role |
|------|------|
| `client-utils.ts` | `ClientUtilsBase` — abstract base class implementing `HttpClient` with `get`, `post`, `put`, `delete`, `request`, `sendStream`, `getStream` methods. Uses pluggable `fetch` function. |
| `client-error.ts` | `ClientError` and `QueryError` classes with typed error codes (`ClientErrorCode`), `from()` factory, and `.toJSON()`. |
| `index.ts` | Node.js entry: `ClientUtils` (node-fetch with HTTP/HTTPS agents), `ClientUtilsCustomAgent` (custom agent injection). Re-exports error classes and types. |
| `index.browser.ts` | Browser entry: `ClientUtils` using `window.fetch`. |
| `types/index.ts` | Type definitions: `HttpClient`, `HttpClientNode`, `HttpClientBrowser`, `SendStreamOptions`, `GetStreamOptions`, `Headers`, `RequestLogger`. |

## Design/Patterns

- **Abstract base** with pluggable fetch enables platform-agnostic HTTP communication.
- **Error chain**: `QueryError` wraps raw fetch errors; `ClientError.from()` maps them to typed domain errors.
- **Dual entry points**: separate Node.js and browser exports with appropriate platform APIs.
- **Convenience methods**: Each HTTP verb (`get`, `post`, `put`, `delete`) delegates to `request()` with appropriate config.

## Integration Points

- `ClientUtilsBase` and `HttpClient` are the base transport used by `@scramjet/api-client` and other API client packages.
- Browser entry is used by web-based consumers of the STH API.
- Error types re-exported by the package root.

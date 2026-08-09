# packages/client-utils/

## Responsibility

Provides base HTTP client utilities and abstractions for REST API communication in Scramjet Transform Hub. Includes abstract `ClientUtilsBase` with common HTTP methods (`get`, `post`, `put`, `delete`, stream handling) and concrete implementations for Node.js (`ClientUtils`, `ClientUtilsCustomAgent`). Also provides a browser-compatible entry point (`index.browser.ts`).

## Design / Patterns

- **Abstract base class**: `ClientUtilsBase` implements the `HttpClient` interface with a pluggable `fetch` function, enabling platform-specific HTTP implementations.
- **Stream support**: `sendStream` method supports `SendStreamOptions` with `end`, `split`, `parseResponse` flags for streaming request/response bodies. `getStream` for readable stream responses.
- **Error handling**: `ClientError` class with typed error codes (`ClientErrorCode`) wraps HTTP errors with status, method, URL context. `ClientError.from()` factory maps `QueryError` status codes to appropriate error codes (400→BAD_PARAMETERS, 401→NEED_AUTHENTICATION, 403→NOT_AUTHORIZED, 404→NOT_FOUND, 410→GONE, 419→INSUFFICIENT_RESOURCES, 422→UNPROCESSABLE_ENTITY, 500+→SERVER_ERROR, ECONNREFUSED→CANNOT_CONNECT). Includes chained `reason`/`source` error support and `.toJSON()`.
- **QueryError**: Thrown by the `fetch` method, carries `url`, `status`, `code`, `body`, and the original `Response`.
- **Custom agent support**: `ClientUtilsCustomAgent` allows injecting custom `http.Agent` / `https.Agent` (e.g., for keep-alive, TLS configuration).
- **Browser entry**: `index.browser.ts` provides a browser-compatible version using `window.fetch` instead of `node-fetch`.
- **Request logger**: `addLogger()` accepts a `RequestLogger` with `request`, `end`, `ok`, `error` callbacks.

## Integration Points

- Consumed by `@scramjet/api-client`, `@scramjet/middleware-api-client`, `@scramjet/multi-manager-api-client` as the HTTP transport layer.
- Depends on `@scramjet/model`, `@scramjet/obj-logger`, `@scramjet/symbols`, `@scramjet/utility`.
- `HttpClient` interface is the shared contract for all STH API client classes.

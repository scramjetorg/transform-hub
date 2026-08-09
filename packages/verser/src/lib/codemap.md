# packages/verser/src/lib/

## Files

| File | Lines | Role |
|------|-------|------|
| `verser.ts` | 70 | `Verser` — server that listens for HTTP CONNECT proxy requests on a provided `http.Server`, wraps each connection in `VerserConnection`, and emits `connect`/`close` events. Extracts STH identity headers (`x-sth-tags`, `x-manager-id`, `x-sth-id`, `x-org-id`). |
| `verser-client.ts` | 218 | `VerserClient` — connects to a Verser server, manages BPMux instance for muxed duplex channels, registers channel callbacks, emits `error`/`close` events. Handles TLS and direct TCP connections. |
| `verser-connection.ts` | 286 | `VerserConnection` — manages a single CONNECT socket with BPMux multiplexing: creates channel listeners, proxies HTTP requests through the tunnel, maintains connected state and agent. |
| `verser-client-default-config.ts` | 9 | `defaultVerserClientOptions` — default `{ headers: {}, verserUrl: "http://localhost:8080" }`. |

## Responsibility

Implements the library modules for the legacy verser reverse-proxy connectivity: server-side CONNECT listener, client-side connection manager with BPMux multiplexing, and per-connection tunnel management.

## Design/Patterns

- All three classes (`Verser`, `VerserClient`, `VerserConnection`) use `TypedEmitter` for typed event emission.
- BPMux (`@scramjet/bpmux`) provides stream multiplexing over a single TCP/TLS socket.
- `VerserClient` supports both TLS and direct TCP connections based on URL scheme.
- `VerserConnection` maintains a `BPMux` instance and a dynamic `agent` for HTTP request routing through the tunnel.

## Integration Points

- Consumed by Manager and STH host processes for reverse-proxy connectivity.
- Depends on `@scramjet/bpmux` (muxing), `@scramjet/obj-logger` (logging), `@scramjet/utility` (merge, TypedEmitter).

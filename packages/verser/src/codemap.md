# packages/verser/src/

## Files

| File | Role |
|------|------|
| `index.ts` | Barrel re-export of all verser modules (lib/*, types). |
| `lib/verser.ts` | `Verser` class (server-side) — listens for HTTP CONNECT, manages incoming VerserConnections, emits connect/close events. |
| `lib/verser-client.ts` | `VerserClient` — connects to a Verser server, manages BPMux multiplexed duplex streams, handles channel registration. |
| `lib/verser-connection.ts` | `VerserConnection` — manages a single connection socket with BPMux multiplexing, request/response proxying, channel listener dispatch. |
| `lib/verser-client-default-config.ts` | Default options for VerserClient (url, headers). |
| `types/index.ts` | Shared type definitions for verser (VerserClientOptions, VerserClientConnection, RegisteredChannels, etc.). |

## Responsibility

Implements the source code for the legacy CONNECT/BPMux reverse-server connectivity. Split into server-side (`Verser`), client-side (`VerserClient`), and connection-level (`VerserConnection`) modules.

## Design/Patterns

- Server (`Verser`) listens on an HTTP server for `CONNECT` proxy requests, wraps each in a `VerserConnection`, and emits typed events.
- Client (`VerserClient`) connects to the verser server via HTTP CONNECT or direct TCP/TLS, then uses BPMux for channel multiplexing over a single socket.
- Connection (`VerserConnection`) uses BPMux to create/demux duplex streams over the CONNECT tunnel, supporting request forwarding and channel-based communication.
- All three classes use `TypedEmitter` for type-safe event emitters.

# packages/verser/

## Responsibility

Legacy reverse-server connectivity package for Scramjet Transform Hub. It exposes the old `@scramjet/verser` CONNECT/BPMux transport used by historical Manager/STH and runner request forwarding paths. The verser2 rollout treats this package as legacy and targets removal from active connectivity paths.

## Design/Patterns

- CONNECT server wrapper: `src/lib/verser.ts` listens for HTTP `CONNECT` events on an existing server and emits `VerserConnection` instances for accepted sockets.
- Client connector: `src/lib/verser-client.ts` opens an HTTP(S) CONNECT request to a Verser server, negotiates BPMux over the returned socket, and exposes an HTTP agent backed by multiplexed channels.
- Connection façade: `src/lib/verser-connection.ts` wraps an inbound socket, initializes BPMux, exposes deprecated numbered channels, and supports HTTP request forwarding through a multiplexed agent.
- Event emitter pattern: server/client classes extend `TypedEmitter` and emit lifecycle events such as `connect`, `close`, and `error`.

## Data & Control Flow

1. A consumer creates `new Verser(server)` around an HTTP server; incoming `CONNECT` requests are accepted and wrapped as `VerserConnection` objects.
2. `VerserClient.connect()` sends a CONNECT request with registration headers, stores the returned socket, and calls `mux()` to initialize BPMux.
3. `VerserConnection.connect()` creates its own BPMux instance and an HTTP `Agent` whose `createConnection()` returns BPMux child streams.
4. Legacy forwarding paths call `makeRequest()`, `forward()`, or `createChannel(id)` to move HTTP requests or raw duplex channel data over the shared carrier socket.
5. Close/disconnect handling destroys the underlying socket and clears tracked server-side connections.

## Integration Points

- Depends on `@scramjet/bpmux`, `@scramjet/utility`, `@scramjet/obj-logger`, and `@scramjet/types`.
- Historically consumed by Manager, MultiManager, host CPM connector, and runner/HostClient paths; the active track is replacing these with `@signicode/verser2-*` Host/Broker/Guest APIs.
- Package test coverage is limited to deterministic public-export contracts in `test/exports.spec.ts`; legacy real HTTP/TLS forwarding coverage was removed with the behavioral-test migration.
- Public exports are centralized in `src/index.ts`, re-exporting `Verser`, `VerserClient`, `VerserConnection`, and package types.

# packages/runner-node/

## Responsibility

Node runtime child process used by the outer launcher. It receives a boot config file (containing optional `verser2Runtime` block), sets up split host transport via `HostClient` (with verser2 broker for sequence API calls), creates the sequence context, executes sequence functions, and reports lifecycle state back to host.

## Design / Patterns

- **Boot-config only input**: runtime config arrives via validated JSON from argv; `verser2Runtime` block enables verser2-based HTTP agent for `context.hub` API calls.
- **Verser2 broker integration**: when boot config includes `verser2Runtime`, `HostClient.initVerser2BrokerAgent()` creates a `@signicode/verser2-guest-node` broker and uses `createAgent()` to provide outbound HTTP connectivity to the hub.
- **Selective channel opening**: `HostClient` accepts a channel set during `init()`; REQUESTs channel is excluded when verser2 runtime or `requestsUnsupported` is configured.
- **Layered bootstrap**: modules compose boot-config, fd-streams, handshake, context, lifecycle, and execution stages.
- **Split channel model**: child reads/writes fd0..5 and delegates semantic channels (IN/OUT/LOG) to host connection ownership via `LocalChannelServer` from the outer runner.
- **App context variants**: `context.ts` provides two builders — `buildSequenceContext()` (local/no-host mode, discard output) and `buildAppContext()` (full host-backed mode with v2 `HubClient`/`SpaceClient` via `@scramjet/rest-api2`).
- **RunnerAppContext**: sequence-facing `AppContext` implementation with v1 `hub`/`space` legacy clients, v2 `hubClient()`/`spaceClient()`, `APIExpose`, `ILocalStorage`, lifecycle handler registries, `keepAlive`/`end`/`destroy`/`on`/`emit`/`emitToSpace`.
- **InputStream protocol**: `input-stream.ts` parses HTTP-style headers (`\r\n\r\n`) from the input stream beginning and maps to `DataStream` variants by `Content-Type`.
- **Lifecycle error parity**: `RunnerLifecycle` manages STOP/KILL requests with keepAlive tracking, sequence lifecycle state, and `onTerminalStop` callback.
- **AVA fetch-disabled mode**: test scripts set `SCRAMJET_AVA_FETCH=0`, which appends `--no-experimental-fetch` to `NODE_OPTIONS` via `scripts/run-ava.js` — avoids conflicts with Node's experimental fetch in test infrastructure.

## Data & Control Flow

`runner-node` bootstrap parses `process.argv[2]` and validates boot config, then opens fd4/fd5 via `createFdStreams`. If host coordinates are present it connects host channels (`RUNNER_NODE_CHANNELS` = IN/OUT/LOG/REQUESTS) via `HostClient.init()`, reads input stream headers, builds app context with v1/v2 API/storage/proxy wiring, emits PING + healthy monitoring, maps input/output streams, wires control handlers (STOP/KILL/EVENT/STORAGE_UPDATE), and runs the sequence via `runSequence()`.

On completion/failure it writes terminal monitoring frames, runs lifecycle cleanup, disconnects host channels (including verser2 broker `close()`), flushes monitoring, writes exit file, and returns exit code.

## Integration Points

Uses `@scramjet/types`, `@scramjet/symbols`, `@scramjet/api-client`, `@scramjet/api-server`, `@scramjet/rest-api2` (for v2 API clients), `@signicode/verser2-guest-node` (for broker agent), and the outer runtime's boot-config + fd4/fd5 protocol contract.

Relies on `LocalChannelServer` from the outer runner for local channel address resolution.

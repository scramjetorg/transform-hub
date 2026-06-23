# packages/runner/src/

## Responsibility

Core launcher implementation used by outer `start-runner` entry. It owns env parsing, verser2 transport bootstrap, runtime selection/switching, child spawn orchestration, child/host channel plumbing, and the runtime-agnostic inner runner engine (`Runner` class, `RunnerAppContext`, `InputStream` parsing, `LocalStorageAgent`, `MessageUtils`) consumed by `runner-node`.

## Design / Patterns

- **Boundary module decomposition**:
  - `bin/start-runner.ts`: CLI/bootstrap flow with verser2 transport init.
  - `transport/`: verser2 runner transport, config parsing, local channel bridge.
  - `executor/*`: spawn strategies, stdio contracts, entry resolvers, lifecycle helpers.
  - `runner.ts`: runtime-agnostic sequence execution engine (`Runner<X>` class) — loads sequence, creates `AppContext`, wires input/output/control/monitoring streams, handles KILL/STOP/MONITORING_RATE/PONG/STORAGE/EVENT control messages.
  - `runner-app-context.ts`: `RunnerAppContext` implementing `AppContext` with v1/v2 hub/space clients, `APIExpose`, `ILocalStorage`, `EventEmitter`, monitoring writer, lifecycle handler registries.
  - `input-stream.ts`: input stream header parsing (`readInputStreamHeaders`) and `DataStream` mapping (`mapToInputDataStream`).
  - `message-utils.ts`: static `writeMessageOnStream([code, data], stream)` helper.
  - `local-storage-agent.ts`: `ILocalStorage` implementation with promise-based STORAGE_UPDATE ack via monitoring frames.
- **Verser2 transport as default**: host connectivity now uses `RunnerVerser2Transport` with HTTP-based channel routing; the legacy `HostClient` direct-socket approach is preserved in runner-node.
- **Local channel bridge**: `LocalChannelServer` listens on `127.0.0.1:0` and accepts runtime wrapper connections via a 37-byte header protocol (instance ID + channel index), enabling the inner runner to open its semantic channels.
- **Strict channel contract**: child processes are started with 6-slot stdio and only channels 0–2 and 4–5 are actively used for runtime transport.
- **Validation-first startup**: malformed adapter env/paths/ports are rejected before process launch.

## Data & Control Flow

`start-runner.ts` composes:
1. `parseRunnerTransportConfig(instanceId)` reads `SCRAMJET_RUNNER_TRANSPORT_CONFIG` (JSON, kind: "verser2").
2. `RunnerVerser2Transport.init()` starts local channel server + verser2 guest, connects to host.
3. Boot config JSON written with `verser2Runtime` block for inner runtime.
4. `selectExecutor(engines)` -> resolver/launcher -> executor spawn.
5. Bidirectional pipe setup: verser2 routes <-> child fds with lifecycle observation.
6. On child close: `translateChildClose`, terminal frame fallback, transport disconnect, cleanup.

Inner runner flow (`Runner.main()` / `Runner.runSequence()`):
1. `premain()` connects to host, sets up streams, sends PING handshake.
2. `initAppContext(config)` creates `RunnerAppContext` with v1/v2 clients, localStorage agent, `RunnerProxy`.
3. Loads sequence module via `require()`, validates exported functions.
4. `runSequence()` iterates sequence functions, pipes `inputDataStream` through each, last output → host output.
5. Control stream dispatches STOP/KILL/EVENT/STORAGE_UPDATE; on exit calls `cleanup()`, `exit()`.

## Integration Points

- Uses `@scramjet/types`/`@scramjet/symbols` contracts and runtime wrappers (`runner-node`, `runner-bun`, `runner-python`).
- Uses `@scramjet/rest-api2` for v2 `HubClient`/`SpaceClient` in `RunnerAppContext`.
- Uses `@signicode/verser2-guest-node` for verser2 guest connectivity and `LocalChannelServer` for local channel bridge.
- Uses Node process primitives (`child_process.spawn`, `stream`, `fs`, `net`).
- Inner `Runner` class re-exported via `index.ts` for `runner-node` consumption.

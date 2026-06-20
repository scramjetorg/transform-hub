# packages/runner/src/

## Responsibility

Core launcher implementation used by outer `start-runner` entry. It owns env parsing, verser2 transport bootstrap, runtime selection/switching, child spawn orchestration, and child/host channel plumbing.

## Design / Patterns

- **Boundary module decomposition**:
  - `bin/start-runner.ts`: CLI/bootstrap flow with verser2 transport init.
  - `transport/`: verser2 runner transport, config parsing, local channel bridge.
  - `executor/*`: spawn strategies and stdio contracts per runtime.
  - `runner.ts` + context/input/message utilities: runtime-agnostic sequence execution helpers (inner runner, used by runner-node).
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

## Integration Points

- Uses `@scramjet/types`/`@scramjet/symbols` contracts and runtime wrappers (`runner-node`, `runner-bun`, `runner-python`).
- Uses `@signicode/verser2-guest-node` for verser2 guest connectivity and `LocalChannelServer` for local channel bridge.
- Uses Node process primitives (`child_process.spawn`, `stream`, `fs`, `net`).

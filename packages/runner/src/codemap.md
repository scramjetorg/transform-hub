# packages/runner/src/

## Responsibility

Core launcher implementation used by outer `start-runner` entry. It owns env parsing, host-transport bootstrap, runtime selection/switching, child spawn orchestration, and child/host channel plumbing.

## Design / Patterns

- **Boundary module decomposition**:
  - `bin/start-runner.ts`: CLI/bootstrap flow.
  - `executor/*`: spawn strategies and stdio contracts per runtime.
  - `host-client.ts`: partial channel client exposing upstream/downstream sockets.
  - `runner.ts` + context/input/message utilities: runtime-agnostic sequence execution helpers.
- **Strict channel contract**: child processes are started with 6-slot stdio and only channels 0–2 and 4–5 are actively used for runtime transport.
- **Validation-first startup**: malformed adapter env/paths/ports are rejected before process launch.

## Data & Control Flow

`start-runner.ts` composes: env validation -> boot-config writing -> host `HostClient.init(OUTER_RUNNER_CHANNELS)` -> runtime resolver -> executor spawn -> bidirectional pipe setup (`STDIN`, `STDOUT`, `STDERR`, `CONTROL`, `MONITORING`) -> lifecycle observation/translation -> host disconnect and cleanup.

Monitoring stream observation is read-only and non-destructive; stdout/stderr are forwarded as raw bytes to preserve existing host expectations.

## Integration Points

- Uses `@scramjet/types`/`@scramjet/symbols` contracts and runtime wrappers (`runner-node`, `runner-bun`, `runner-python`).
- Uses host transport and Node process primitives (`child_process.spawn`, `stream`, `fs`, `net`-style sockets via `HostClient`).
- Keeps compatibility surfaces for `@scramjet/api-client`/`@scramjet/api-server` patterns used by the inner runtime package.

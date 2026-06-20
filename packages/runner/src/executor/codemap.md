# packages/runner/src/executor/

## Responsibility

Child-process launch/execution adapters for Node/Bun/Python and the runtime-selection layer used by outer startup. Also provides stream forwarding, lifecycle observation, and exit-code translation helpers.

## Design / Patterns

- **Strategy pattern**: `selectExecutor(config)` returns one of `nodeExecutor`, `bunExecutor`, or `pythonExecutor` based on `selectRuntimeKind(engines)`.
- **Uniform contract**: each executor exposes a `RuntimeExecutor` with a `spawn()` method and returns `RuntimeProcessHandles`.
- **Runtime-specific guardrails**:
  - Node: absolute-path validation and optional ts-node setup (`--require` when `needsTsNode` is resolved via `runnerNodeLauncher`).
  - Bun/Python: strips outer-runner env (`SEQUENCE_*`, `RUNNER_CONNECT_INFO`) and injects runtime binary (`BUN_BIN`/`PYTHON_BIN` defaults).
- **Strict stream validation**: stdio slots 0–5 are enforced and control/monitoring handles are guaranteed duplex-capable before return.
- **Non-destructive monitoring observation**: `lifecycle-observer.ts` inspects a copy of the monitoring stream for terminal frames (`SEQUENCE_COMPLETED`/`SEQUENCE_STOPPED`) without consuming the bytes from the stream, so the outer runner can still pipe it through to host.

Sub-modules:
- `select.ts`: runtime kind -> executor mapping.
- `node-process-executor.ts`: Node child spawn + stdio contract.
- `bun-process-executor.ts`: Bun child spawn + env stripping.
- `python-process-executor.ts`: Python child spawn + env stripping.
- `runner-node-launcher.ts`: resolves `runner-node` runtime entry path (with ts-node fallback).
- `runner-bun-launcher.ts`: resolves `runner-bun` runtime entry path.
- `stream-forwarder.ts`: raw passthrough of child stdout/stderr to host with `{ end: false }`.
- `lifecycle-observer.ts`: non-destructive monitoring scan for terminal frames.
- `exit-translation.ts`: `close` event → `RunnerExitCode`/`RunnerMessageCode` mapping + terminal frame writer.

## Data & Control Flow

`start-runner` passes `engines` and spawn options into `selectExecutor`. The chosen executor then:
- spawns child with fixed stdio layout (`[pipe,pipe,pipe,ipc,pipe,pipe]`).
- returns validated handles (`stdout`, `stderr`, `control`, `monitoring`, `child`).
- leaves channel framing untouched for outer runner to forward raw bytes.

Lifecycle helpers (`lifecycle-observer`, `exit-translation`) inspect the child monitoring stream for terminal markers and translate process close outcomes into canonical runner exit semantics.

## Integration Points

Depends on `@scramjet/types` runtime interfaces, `@scramjet/symbols` runtime selection + message codes, Node `child_process`/`stream` modules, and `@scramjet/runner-node`/`@scramjet/runner-bun` entry resolvers.

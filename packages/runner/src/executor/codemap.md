# packages/runner/src/executor/

## Responsibility

Child-process launch/execution adapters for Node/Bun/Python, runtime-selection layer, entry resolvers, stream forwarding, lifecycle observation, and exit-code translation helpers used by outer startup.

## Design / Patterns

- **Strategy pattern**: `selectExecutor(config)` returns one of `nodeExecutor`, `bunExecutor`, or `pythonExecutor` based on `selectRuntimeKind(engines)` from `@scramjet/symbols`.
- **Uniform contract**: each executor exposes a `RuntimeExecutor` with a `spawn()` method and returns `RuntimeProcessHandles`.
- **6-slot stdio layout**: all runtimes use the same 6-slot layout:
  - fd0: stdin (pipe)
  - fd1: stdout (pipe)
  - fd2: stderr (pipe)
  - fd3: IPC (reserved — ensures Node creates IPC; `channel.unref()` in Bun executor)
  - fd4: control (raw duplex byte pipe)
  - fd5: monitoring (raw duplex byte pipe)
- **Runtime-specific guardrails**:
  - Node (`node-process-executor.ts`): absolute-path validation, optional ts-node setup (`--require` when `needsTsNode`).
  - Bun (`bun-process-executor.ts`): uses `process.env.BUN_BIN || "bun"`, strips `SEQUENCE_*`/`RUNNER_CONNECT_INFO` from child env.
  - Python (`python-process-executor.ts`): uses `process.env.PYTHON_BIN || "python3"`, builds `PYTHONPATH` via candidate search, two spawn forms (production `-m runner_python` vs test override).
- **Entry resolvers**:
  - `runner-node-launcher.ts`: resolves `@scramjet/runner-node` entry — searches `package.json` bin, dist, src with ts-node fallback; returns `ResolvedRunnerNodeEntry { entry, needsTsNode }`.
  - `runner-bun-launcher.ts`: resolves `@scramjet/runner-bun` entry — searches dist, bin, src; returns `ResolvedRunnerBunEntry { entry }`.
- **Non-destructive monitoring observation** (`lifecycle-observer.ts`): inspects a copy of the monitoring stream for terminal frames (`SEQUENCE_COMPLETED`/`SEQUENCE_STOPPED`) without consuming bytes from the stream.
- **Stream forwarding** (`stream-forwarder.ts`): pipes child stdout/stderr to host with `{ end: false }`; idempotent `detach()` for teardown.
- **Exit translation** (`exit-translation.ts`): `close` event → `TranslatedChildClose` with `RunnerExitCode`/`RunnerMessageCode` mapping + terminal frame writer.

Sub-modules:
- `select.ts`: runtime kind -> executor mapping (bun → bunExecutor, python3 → pythonExecutor, default → nodeExecutor).
- `node-process-executor.ts`: Node child spawn + stdio contract.
- `bun-process-executor.ts`: Bun child spawn + env stripping + IPC fd unref.
- `python-process-executor.ts`: Python child spawn + PYTHONPATH resolution.
- `runner-node-launcher.ts`: resolves `runner-node` runtime entry path.
- `runner-bun-launcher.ts`: resolves `runner-bun` runtime entry path.
- `stream-forwarder.ts`: raw passthrough of child stdout/stderr to host.
- `lifecycle-observer.ts`: non-destructive monitoring scan for terminal frames.
- `exit-translation.ts`: `close` event → exit code/message mapping + terminal frame writer.

## Data & Control Flow

`start-runner` passes `engines` and spawn options into `selectExecutor`. The chosen executor then:
- spawns child with fixed stdio layout (`[pipe,pipe,pipe,ipc,pipe,pipe]`).
- returns validated handles (`stdout`, `stderr`, `control`, `monitoring`, `child`).
- leaves channel framing untouched for outer runner to forward raw bytes.

Lifecycle helpers (`lifecycle-observer`, `exit-translation`) inspect the child monitoring stream for terminal markers and translate process close outcomes into canonical runner exit semantics.

## Integration Points

Depends on `@scramjet/types` runtime interfaces (BootConfig, SpawnOptions, RuntimeProcessHandles, RuntimeExecutor), `@scramjet/symbols` runtime selection + message codes, Node `child_process`/`stream` modules, and `@scramjet/runner-node`/`@scramjet/runner-bun` entry resolvers.

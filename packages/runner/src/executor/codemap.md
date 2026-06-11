# packages/runner/src/executor/

## Responsibility

Child-process launch/execution adapters for Node/Bun/Python and the runtime-selection layer used by outer startup.

## Design / Patterns

- **Strategy pattern**: `selectExecutor(...)` returns one of `nodeExecutor`, `bunExecutor`, or `pythonExecutor`.
- **Uniform contract**: each executor exposes a `RuntimeExecutor` with a `spawn()` method and returns `RuntimeProcessHandles`.
- **Runtime-specific guardrails**:
  - Node: absolute-path validation and optional ts-node setup (`--require` when `needsTsNode` is resolved).
  - Bun/Python: strips outer-runner env (`SEQUENCE_*`, `RUNNER_CONNECT_INFO`) and injects runtime binary (`BUN_BIN`/`PYTHON_BIN` defaults).
- **Strict stream validation**: stdio slots 0–5 are enforced and control/monitoring handles are guaranteed duplex-capable before return.

The module also contains stream-forward/inspection helpers used by the outer runtime:
- `stream-forwarder.ts` for host passthrough of child `stdout`/`stderr`
- `lifecycle-observer.ts` for non-destructive monitoring scan of terminal frames
- `exit-translation.ts` for `close` → `RunnerExitCode`/`RunnerMessageCode` mapping

## Data & Control Flow

`start-runner` passes `engines` and spawn options into `selectExecutor`. Launcher modules choose runtime; executor `spawn` functions then:

- spawn child with fixed stdio layout (`[pipe,pipe,pipe,ipc,pipe,pipe]`).
- return validated handles (`stdout`, `stderr`, `control`, `monitoring`, `child`)
- leave channel framing untouched for outer runner to forward raw bytes.

Lifecycle helpers inspect the child monitoring stream for terminal markers and translate process close outcomes into canonical runner exit semantics.

## Integration Points

Depends on `@scramjet/types` runtime interfaces, `@scramjet/symbols` runtime selection + message codes, Node `child_process`/`stream` modules, and `@scramjet/runner-node`/`@scramjet/runner-bun` entry resolvers.

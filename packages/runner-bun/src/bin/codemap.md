# packages/runner-bun/src/bin/

## Responsibility

Executable Bun entrypoint (`runner-bun`). Validates boot config (including `verser2Runtime` block), requires host channels (throws if absent), then delegates execution to `runner-node` via child process spawn. No direct Bun sequence invocation — all sequences run through the supported hosted Node runtime path.

## Design / Patterns

- **Host-channels required**: entrypoint validates that `instancesServerPort` and `instancesServerHost` are present; if either is missing, the process exits with an error. There is no fallback to direct execution.
- **Pure delegation**: after validation, `runRunnerNode()` spawns `node` with the resolved `runner-node` entry and the boot-config path. Bun itself does not load or execute sequence code.
- **Error normalization**: failure paths consistently serialize error details (`logRuntimeError` with phase, runtime, sequence/instance IDs) and map to process exit codes.
- **Legacy env var cleanup**: explicitly deletes `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO` before child spawn to avoid environment-based config leakage.
- **`resolveRunnerNodeEntry()`**: dynamic resolution strategy — checks compiled dist first (`dist/bin/runner-node.js`), then prebuilt workspace bin (`bin/runner-node.js`), then source with ts-node registration (`src/bin/runner-node.ts`).
- **Signal forwarding**: forwards `SIGINT`/`SIGTERM` from the Bun process to the Node child process.

## Data & Control Flow

1. `parseBootConfigPathFromArgv(process.argv)` and `readBootConfig` validate runtime contract (including verser2Runtime block).
2. If host coordinates (`instancesServerPort`, `instancesServerHost`) are absent, throw — Bun sequences require the hosted runner path.
3. Spawn a `node` process with resolved runner-node entry (ts-node fallback when needed), pass boot-config path.
4. Pipe through `stdio: [inherit, inherit, inherit, ipc, inherit, inherit]` and convert exit signal/code to entry exit status.
5. Forward `SIGINT`/`SIGTERM` to child; clean up listeners on close/error.

## Integration Points

Relies on Node process spawning, `@scramjet/runner-node` entry resolution (`resolveRunnerNodeEntry`), and shared error/logging conventions used by outer and node runtimes. Boot-config parser shared with test fixtures.

# packages/runner-bun/src/bin/

## Responsibility

Executable Bun entrypoint (`runner-bun`). Normalizes boot config and executes either direct Bun sequence invocation or delegated Node runtime execution.

## Design / Patterns

- **Conditional branching** on host transport presence in boot config.
- **Separation of concerns**: Bun-specific runtime validation and logging isolated from Node delegation code path.
- **Error normalization**: failure paths consistently serialize error details and map to process exit codes.

## Data & Control Flow

- `parseBootConfigPathFromArgv(process.argv)` and `readBootConfig` validate runtime contract before execution.
- If both `instancesServerHost` and `instancesServerPort` are absent, run directly in Bun by requiring `sequencePath` and executing exported functions with args over an empty input stream.
- If host is configured, spawn a `node` process with resolved runner-node entry (ts-node fallback when needed), pass boot-config path, and preserve required stdio channels.
- Pipe through `stdio: [inherit, inherit, inherit, ipc, inherit, inherit]` and convert exit signal/code to entry exit status.

## Integration Points

Relies on Bun/Node process spawning, `@scramjet/runner-node` entry resolution, and shared error/logging conventions used by outer and node runtimes.

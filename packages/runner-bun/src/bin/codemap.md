# packages/runner-bun/src/bin/

## Responsibility

Executable Bun entrypoint (`runner-bun`). Normalizes boot config (including `verser2Runtime` block) and executes either direct Bun sequence invocation (optionally with verser2 guest/broker) or delegated Node runtime execution.

## Design / Patterns

- **Conditional branching** on host transport presence in boot config.
- **Verser2 support**: in direct mode, optionally creates verser2 guest (`startBunSequenceGuest`) for API exposure and verser2 broker (`createBunHubFetch`) for hub API calls.
- **Separation of concerns**: Bun-specific runtime validation and logging isolated from Node delegation code path.
- **Error normalization**: failure paths consistently serialize error details and map to process exit codes.

## Data & Control Flow

1. `parseBootConfigPathFromArgv(process.argv)` and `readBootConfig` validate runtime contract (including verser2Runtime block).
2. If both `instancesServerHost` and `instancesServerPort` are absent, run directly in Bun by requiring `sequencePath` and executing exported functions with args over an empty input stream. If verser2 config is present, start verser2 guest + broker for API exposure.
3. If host is configured, spawn a `node` process with resolved runner-node entry (ts-node fallback when needed), pass boot-config path (with verser2Runtime), and preserve required stdio channels.
4. Pipe through `stdio: [inherit, inherit, inherit, ipc, inherit, inherit]` and convert exit signal/code to entry exit status.

## Integration Points

Relies on Bun/Node process spawning, `@scramjet/runner-node` entry resolution, `@signicode/verser2-guest-bun` for verser2 connectivity, and shared error/logging conventions used by outer and node runtimes.

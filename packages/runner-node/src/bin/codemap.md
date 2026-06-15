# packages/runner-node/src/bin/

## Responsibility

Runtime executable entrypoint for Node child execution. It is the concrete bootstrap command invoked by outer runners (directly or via Bun delegate) and returns the final runner exit code.

## Design / Patterns

- **Single async bootstrap** with explicit try/finally cleanup sequencing.
- **Error funneling**: errors are mapped to runtime logging + process exit via `writeProcessExitFile` and exit codes.
- **Exported utility surface**: re-exports internal context/build helpers for testability/use by callers.

## Data & Control Flow

- Parses boot config path from `argv` and validates via `readBootConfig`.
- Opens fd streams (`stdin/stdout/stderr/control/monitoring`) and determines host-backed mode.
- Loads sequence module and builds app/sequence context.
- Establishes host connectivity and verser2 runtime request metadata when configured, sets up ping/control handlers, writes monitoring/keepalive frames.
- Executes sequence, writes terminal monitoring frame for completion/failure.
- Disconnects host, tears down streams, writes legacy/secure process exit artifacts, returns numeric exit status.

## Integration Points

Uses package internals: `boot-config`, `context`, `fd-streams`, `handshake`, `host-client`, `lifecycle`, `run-sequence`, `utils`, plus Node process stdio descriptors and `@scramjet` protocol symbols.

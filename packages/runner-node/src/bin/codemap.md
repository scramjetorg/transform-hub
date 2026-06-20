# packages/runner-node/src/bin/

## Responsibility

Runtime executable entrypoint for Node child execution (`runner-node.ts`). It is the concrete bootstrap command invoked by outer runners (directly or via Bun delegate) and returns the final runner exit code. Supports verser2 runtime configuration for hub API connectivity.

## Design / Patterns

- **Single async bootstrap** with explicit try/finally cleanup sequencing.
- **Verser2-aware HostClient construction**: reads `verser2Runtime` from boot config and passes it to `HostClient` constructor; the broker agent is created during `HostClient.init()`.
- **Selective channel filtering**: when `verser2Runtime` or `requestsUnsupported` is configured, the REQUESTS channel is excluded from the channel set.
- **Error funneling**: errors are mapped to runtime logging + process exit via `writeProcessExitFile` and exit codes.
- **Exported utility surface**: re-exports internal context/build helpers for testability/use by callers.

## Data & Control Flow

1. Parses boot config path from `argv` and validates via `readBootConfig` (which validates the `verser2Runtime` block).
2. Opens fd streams (`stdin/stdout/stderr/control/monitoring`) and determines host-backed mode.
3. If host mode: creates `HostClient` with `instancesServerPort/Host`, `requestsUnsupported`, and `verser2Runtime`; selectively opens channels.
4. Builds app/sequence context, establishes host connectivity with verser2 broker agent when configured, sets up ping/control handlers, writes monitoring/keepalive frames.
5. Executes sequence, writes terminal monitoring frame for completion/failure.
6. Disconnects host (closes verser2 broker), tears down streams, writes legacy/secure process exit artifacts, returns numeric exit status.

## Integration Points

Uses package internals: `boot-config` (with verser2 validation), `context`, `fd-streams`, `handshake`, `host-client` (with verser2 broker), `lifecycle`, `run-sequence`, `utils`, plus Node process stdio descriptors and `@scramjet` protocol symbols.

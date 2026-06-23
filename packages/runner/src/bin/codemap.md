# packages/runner/src/bin/

## Responsibility

Outer runner bootstrap executable (`start-runner.ts`). It is the startup boundary between host adapter env and the actual runtime child process, now using verser2 transport as the default connectivity path. Also includes a legacy startup shell script (`start.sh`).

## Design / Patterns

- **Verser2 transport startup**: `RunnerVerser2Transport` initializes before the child is spawned; it creates a local TCP server (`LocalChannelServer`) that the inner runtime connects to for its semantic channels.
- **Fail-fast startup**: parse and validate `SCRAMJET_RUNNER_TRANSPORT_CONFIG` (verser2 JSON), all required env vars, ports, and sequence path before touching child process state.
- **Boot config with verser2 block**: `writeBootConfig()` includes `verser2Runtime` with `hostUrl`, `runnerGuestId`, `runnerRouteDomain`, `hubBrokerId`, TLS config, and lease timeouts.
- **RPC exposure**: `observeRpcExpose` monitors the child monitoring stream for PING frames containing `exposePort`/`exposeHost`, forwarding to `RunnerVerser2Transport.setRpcTarget()` so sequence API routes are proxied through the verser2 guest.
- **Deterministic stream wiring**: raw passthrough with `{ end: false }` semantics for host-facing streams; lifecycle observer non-destructively inspects monitoring for terminal frames.
- **Legacy start.sh**: Bash wrapper that sets up pipe FDs (`STDIO_IN`, `STDIO_OUT`, `STDIO_ERR`) with crash log capture — maintained for backward compatibility but the main path is now `start-runner.ts` directly.

## Data & Control Flow

1. Read and validate `SCRAMJET_RUNNER_TRANSPORT_CONFIG`, `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO`, `INSTANCE_ID`.
2. Initialize `RunnerVerser2Transport` — starts local channel server, creates verser2 guest, connects to host.
3. Resolved `instancesServerHost`/`instancesServerPort` from `LocalChannelServer` address.
4. Write private boot JSON (mode `0600`) in temp dir with verser2 runtime config.
5. Choose executor via `selectExecutor(engines)`; resolve runtime entry (`runner-node` / `runner-bun`).
6. Spawn runtime with matching executor config.
7. Wire verser2 <-> child channels:
   - verser2 stdin -> child stdin (fd0).
   - child stdout/stderr -> verser2 stdout/stderr routes.
   - verser2 control -> child fd4.
   - child fd5 -> verser2 monitoring route (with lifecycle observation + RPC expose scanning).
8. On child `close`: if no terminal lifecycle frame observed, emit one; disconnect transport; remove boot file; exit with translated runner code.

## Integration Points

`RunnerVerser2Transport`, `parseRunnerTransportConfig`, `LocalChannelServer`, `selectExecutor`, launcher resolvers (`runner-node-launcher.ts`, `runner-bun-launcher.ts`), `forwardChildStdio`, `lifecycle-observer`, `exit-translation` (`translateChildClose`, `writeTerminalLifecycleFrame`), and `runner-node`/`runner-bun` runtime packages.

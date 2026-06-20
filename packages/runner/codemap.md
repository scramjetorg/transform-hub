# packages/runner/

## Responsibility

Outer orchestration runtime for sequence launch from adapters. It reads `SCRAMJET_RUNNER_TRANSPORT_CONFIG` to establish a verser2-based host transport, validates adapter-sourced env, creates a temporary boot-config file, spawns the selected child runtime (Node/Bun/Python), wires host <-> child channels via `RunnerVerser2Transport`, and translates process termination into stable runner exit behavior.

## Design / Patterns

- **Verser2-based host transport**: uses `@signicode/verser2-guest-node` to connect to the verser2 host as a guest; exposes a local `LocalChannelServer` for the inner runtime to connect its semantic channels (IN/OUT/LOG).
- **Split transport ownership**: outer runner owns legacy channels `STDIN/STDOUT/STDERR/CONTROL/MONITORING` via HTTP routes on the verser2 guest; `runner-node` owns semantic channels `IN/OUT/LOG/REQUESTS` through the local channel bridge.
- **Strategy selection**: runtime is chosen via `selectExecutor(config)` from sequence/app config engines.
- **Process abstraction**: executor modules expose a consistent `RuntimeExecutor` contract (`spawn(...)`) and fixed 6-slot stdio layout (`fd0`–`fd5`).
- **Resilient lifecycle handling**: stdout/stderr forwarding is raw passthrough; lifecycle observer non-destructively inspects the monitoring stream for terminal frames without consuming bytes.

## Data & Control Flow

1. Parse and validate `SCRAMJET_RUNNER_TRANSPORT_CONFIG` (verser2 JSON), `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO`, and instance metadata.
2. Initialize `RunnerVerser2Transport`: creates local channel server + verser2 guest, connects to host, opens HTTP routes for stdin/stdout/stderr/control/monitoring.
3. Resolve runtime entry for Node/Bun/Python via dedicated launcher resolvers.
4. Write minimal `RunnerNodeBootConfig` JSON (`sequencePath`, instance routing, args/config, `verser2Runtime` block).
5. Spawn child with runtime-specific executor and sanitized env (legacy adapter env vars not forwarded).
6. Wire host <-> child channels:
   - verser2 stdin/content routes -> child stdin (fd0).
   - child stdout/stderr -> verser2 stdout/stderr HTTP routes.
   - verser2 control route -> child fd4.
   - child fd5 -> verser2 monitoring route.
7. Observe monitoring stream for terminal lifecycle frames from child; `observeRpcExpose` monitors PING frames for sequence API exposure.
8. If child exits without a terminal frame, outer runner emits equivalent terminal frame itself.
9. Map child close signal/code via `translateChildClose`, disconnect verser2 transport, remove temp boot file, set final exit code.

## Integration Points

- `@scramjet/types`, `@scramjet/symbols`, `@scramjet/api-client`, `@scramjet/api-server`, `@scramjet/client-utils`
- `@scramjet/runner-node`, `@scramjet/runner-bun`, `@scramjet/runner-python`
- `@signicode/verser2-guest-node` for verser2 guest connectivity.
- Host transport via `RunnerVerser2Transport` + `LocalChannelServer` and Node child process APIs.

# packages/runner/

## Responsibility

Outer orchestration runtime for sequence launch from adapters. It validates adapter-sourced env, creates a temporary boot-config file, establishes the split host transport contract, spawns the selected child runtime (Node/Bun/Python), and translates process termination into stable runner exit behavior.

## Design / Patterns

- **Split transport ownership**: outer runner owns legacy channels `STDIN/STDOUT/STDERR/CONTROL/MONITORING`; `runner-node` owns semantic channels `IN/OUT/LOG/REQUESTS`.
- **Strategy selection**: runtime is chosen via `selectRuntimeKind(...)` from sequence/app config.
- **Process abstraction**: executor modules expose a consistent `RuntimeExecutor` contract (`spawn(...)`) and fixed 6-slot stdio layout (`fd0`–`fd5`) while runtime-specific launch concerns stay in launchers.
- **Resilient lifecycle handling**: stdout/stderr forwarding is raw passthrough and lifecycle handling is non-invasive (observer inspects monitoring stream while leaving bytes untouched).

## Data & Control Flow

1. Read and validate `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO`, host instance metadata.
2. Resolve runtime entry for Node/Bun/Python via dedicated launcher resolvers.
3. Write minimal `RunnerNodeBootConfig` JSON (`sequencePath`, instance routing, args/config, exposure/logging metadata).
4. Spawn child with runtime-specific executor and sanitized env (legacy adapter env vars are not forwarded).
5. Wire host channels:
   - host stdin/stdout/stderr/control/monitoring streams connect to child pipes
   - host `stdin -> child stdin`, child stdio/monitor channels forwarded raw into host.
6. Observe monitoring stream for terminal lifecycle frames; if child exits without one, outer runner emits equivalent terminal frame itself.
7. Map child close signal/code using `RunnerExitCode`, disconnect host, remove temp boot file, set final exit code.

## Integration Points

- `@scramjet/types`, `@scramjet/symbols`, `@scramjet/api-client`, `@scramjet/api-server`, `@scramjet/client-utils`
- `@scramjet/runner-node`, `@scramjet/runner-bun`, `@scramjet/runner-python`
- Host transport (`HostClient` + `CommunicationChannel`) and Node child process APIs.

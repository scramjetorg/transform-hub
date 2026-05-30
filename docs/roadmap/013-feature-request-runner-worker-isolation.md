# Feature Request: Runner Worker Isolation

| Field | Value |
| ----- | ----- |
| Title | Runner worker isolation |
| Category | feature-request |
| Scope | packages/runner, packages/runner-node |
| Breaking | no |

## Problem Statement

The Node runner currently mixes host communication, lifecycle reporting, and user sequence execution in one runtime context. A sequence-level failure can take down the same module that should report diagnostics to the hub, and stdout/stderr capture relies on globally replacing `process.stdout` and `process.stderr`.

## Current Behavior

- `packages/runner` is both the executable control-plane and the module that loads and executes Node sequence code.
- Sequence functions run in the same process context that owns `HostClient`, monitoring, control, input, output, and lifecycle streams.
- `Runner.redirectOutputs()` overrides parent-process stdout and stderr, then forwards those writes to host STDOUT/STDERR channels.
- Runner failure reporting is primarily tied to process exit codes and crash logs, so there is no clean boundary between "sequence failed" and "runner control-plane failed".
- Adding another runtime such as Bun would require threading more runtime-specific execution logic into the existing runner instead of plugging in a separate executor.

## Expected Behavior

- `packages/runner` remains the executable launched by the host adapters and continues to own launch supervision, stdio hookup, raw control/monitoring passthrough, lifecycle reporting, and shutdown coordination.
- Node sequence execution moves into a separate `runner-node` wrapper module that is spawned by the main runner as an isolated Node child process.
- A JavaScript-level sequence failure terminates the child process and is reported as a sequence failure, while the outer runner remains alive long enough to relay stdout/stderr and last-resort diagnostics to the hub.
- Node sequence stdout and stderr are captured from the child process directly and forwarded to existing host STDOUT/STDERR streams without replacing parent-process stdio.
- Sequence execution does not receive runner-owned boot data through process environment variables. The outer runner passes boot metadata through a private config handoff and streams control/monitoring over pipes.
- Communication between the sequence wrapper and the main runner uses `child_process.spawn()` with real OS pipes. Stdio uses fd 0/1/2, fd 3 is reserved as unused `ipc` for Node compatibility, and control/monitoring passthrough uses fd 4/5 pipes.
- The new executor boundary leaves a clear path for future `runner-python` and `runner-bun` wrappers without changing the host-facing runner executable.

## Proposed Change

1. Split runner responsibilities into two layers:
   - `packages/runner`: executable launcher, stdio hookup, raw control/monitoring pipe passthrough, lifecycle supervision, shutdown, and executor orchestration.
   - `runner-node`: Node sequence runtime responsible for loading the sequence module, owning sequence-facing communication semantics, and running user code inside the child process.
2. For Node sequences, have the main runner create the child through an executor abstraction and pass only the data needed to run the sequence plus host connection metadata required by runner-node to preserve current communication semantics.
3. Replace runner-to-sequence environment variables such as `SEQUENCE_PATH`, `SEQUENCE_INFO`, and `RUNNER_CONNECT_INFO` with an internal executor protocol. Adapter-level environment can still launch `packages/runner`, but sequence wrappers should receive execution metadata from the runner, not from inherited process env.
4. Define a pipe-based contract between the main runner and sequence wrappers for stdio, control, monitoring, lifecycle completion, and failure reporting without proxying exposed API handlers or streaming HTTP bodies.
5. Use Node `child_process.spawn()` for the first `runner-node` implementation with `stdio: ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"]`. Pipe child stdout/stderr to the existing host STDOUT/STDERR streams and reserve fd 3 as unused IPC and fd 4/fd 5 for control and monitoring passthrough.
6. Replace parent-process stdout/stderr overrides in the Node path with per-child stream forwarding. Parent runner logs should continue to use the log channel, not sequence stdout/stderr.
7. Convert child process termination events into existing runner lifecycle messages when the child cannot report first: normal completion, thrown error, unhandled rejection, explicit `process.exit()`, non-zero exit, signal exit, and forced shutdown.
8. Preserve the host-side protocol. The hub and `csi-controller` should continue receiving the same stream channels and lifecycle messages; this change is internal to the runner package boundary.
9. Define the executor interface so future runtime wrappers can be added without changing the host-facing contract:
   - `runner-node` for spawned Node child processes in this proposal.
   - `runner-python` as a later wrapper around Python execution.
   - `runner-bun` as a later wrapper for Bun execution once Bun support is designed.
10. Document the isolation boundary: spawned child processes provide a real process boundary for Node sequence execution and stdio capture, but they are not an OS sandbox and do not replace Docker/Kubernetes isolation for untrusted code.

## Backwards Compatibility

No breaking changes. The host still launches `packages/runner` as the executable, and existing Node sequences should keep the same public sequence contract, stream behavior, and host API behavior.

## Testing Plan

- Unit test: main runner selects the Node process executor for Node sequences and passes the expected sequence path, args, config, and lifecycle data through private boot config plus pipes, not runner-owned environment variables.
- Unit test: `runner-node` reports normal completion, thrown errors, unhandled rejections, explicit child exits, signal exits, and forced shutdowns through pipe-based lifecycle handling.
- Unit test: child stdout and stderr are forwarded to separate host STDOUT/STDERR streams without mutating parent `process.stdout` or `process.stderr`.
- Unit test: sequence wrapper startup does not read runner-owned values from `process.env`; metadata comes from private boot config and pipe wiring.
- Integration test: start a Node sequence that throws after writing to stdout/stderr; verify the hub receives both streams and a structured failure instead of losing communication immediately.
- Integration test: start a successful Node sequence and verify existing output, monitoring, and lifecycle behavior remain compatible with current host endpoints.
- Manual verification: run `yarn start:dev -- --runtime-adapter=process`, deploy a simple Node sequence, then repeat with a sequence that throws and confirm diagnostics are relayed before cleanup.

## References

- `packages/runner/src/runner.ts`
- `packages/runner/src/host-client.ts`
- `packages/runner/src/bin/start-runner.ts`
- `packages/host/src/lib/csi-controller.ts`
- `packages/adapter-process/src/process-instance-adapter.ts`
- `packages/adapters-common/src/get-runner-env.ts`
- `docs/roadmap/011-feature-request-sequence-lifecycle-hooks.md`

## Correction Note

The implementation plan for this request is corrected in `.omo/plans/runner-worker-isolation.md`. Current `devel` at `1e4a5a20921f517dcb2a6e7bbc940c10a7f3a5a6` is the spawn point for the implementation branch. The corrected design rejects thread or RPC-style sequence execution because that boundary cannot provide the required extra fd pipes and would change sequence API streaming semantics. The planned transport is `child_process.spawn()` with fd 0/1/2 for stdio, fd 3 reserved as unused IPC, and fd 4/5 for control/monitoring passthrough.

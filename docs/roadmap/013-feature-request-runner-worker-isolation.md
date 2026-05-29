# Feature Request: Runner Worker Isolation

| Field | Value |
| ----- | ----- |
| Title | Runner worker isolation |
| Category | feature-request |
| Scope | packages/runner, packages/types, packages/host |
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

- `packages/runner` remains the executable launched by the host adapters and continues to own host communication, stream wiring, lifecycle reporting, and shutdown coordination.
- Node sequence execution moves into a separate `runner-node` wrapper module that is spawned by the main runner as an isolated execution worker.
- A JavaScript-level sequence failure terminates the worker and is reported by the main runner as a sequence failure, while the runner control-plane remains alive long enough to relay status, stdout/stderr, and diagnostics to the hub.
- Node sequence stdout and stderr are captured from the worker directly and forwarded to existing host STDOUT/STDERR streams without replacing parent-process stdio.
- Sequence execution does not receive runner control data through process environment variables. The runner passes execution metadata through a private executor protocol instead.
- Communication between the sequence wrapper and the main runner is abstracted behind an executor protocol rather than direct access to `HostClient`, process stdio mutation, or runner-owned environment variables.
- The new executor boundary leaves a clear path for future `runner-python` and `runner-bun` wrappers without changing the host-facing runner executable.

## Proposed Change

1. Split runner responsibilities into two layers:
   - `packages/runner`: executable control-plane, `HostClient`, host stream protocol, monitoring, lifecycle, shutdown, and executor orchestration.
   - `runner-node`: Node sequence executor wrapper responsible for loading the sequence module and running user code inside the worker context.
2. For Node sequences, have the main runner create the worker through an executor abstraction and pass only the data needed to run the sequence: sequence path, app config, arguments, input/output wiring metadata, and lifecycle commands.
3. Replace runner-to-sequence environment variables such as `SEQUENCE_PATH`, `SEQUENCE_INFO`, and `RUNNER_CONNECT_INFO` with an internal executor protocol. Adapter-level environment can still launch `packages/runner`, but sequence wrappers should receive execution metadata from the runner, not from inherited process env.
4. Define a runtime-neutral communication contract between the main runner and sequence wrappers for input, output, monitoring, lifecycle commands, stdout, stderr, completion, and failure reporting.
5. Use Node `worker_threads` for the first `runner-node` implementation. Create workers with stdout/stderr capture enabled and pipe `worker.stdout` / `worker.stderr` to the existing host STDOUT/STDERR streams.
6. Replace parent-process stdout/stderr overrides in the Node path with per-worker stream forwarding. Parent runner logs should continue to use the log channel, not sequence stdout/stderr.
7. Convert worker termination events into structured runner messages: normal completion, thrown error, unhandled rejection, explicit worker `process.exit()`, non-zero exit, and forced shutdown.
8. Preserve the host-side protocol. The hub and `csi-controller` should continue receiving the same stream channels and lifecycle messages; this change is internal to the runner package boundary.
9. Define the executor interface so future runtime wrappers can be added without changing the host-facing contract:
   - `runner-node` for Node workers in this proposal.
   - `runner-python` as a later wrapper around Python execution.
   - `runner-bun` as a later wrapper for Bun execution once Bun support is designed.
10. Document the isolation boundary: worker threads improve JavaScript-level fault isolation and stdout/stderr capture, but they are not an OS sandbox and do not guarantee survival from native crashes, process aborts, or whole-process fatal errors.

## Backwards Compatibility

No breaking changes. The host still launches `packages/runner` as the executable, and existing Node sequences should keep the same public sequence contract, stream behavior, and host API behavior.

## Testing Plan

- Unit test: main runner selects the Node executor for Node sequences and passes the expected sequence path, args, config, and lifecycle data through the executor protocol, not environment variables.
- Unit test: `runner-node` reports normal completion, thrown errors, unhandled rejections, explicit worker exits, and forced shutdowns through the executor interface.
- Unit test: worker stdout and stderr are forwarded to separate host STDOUT/STDERR streams without mutating parent `process.stdout` or `process.stderr`.
- Unit test: sequence wrapper startup does not read runner-owned values from `process.env`; metadata comes from the executor protocol.
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

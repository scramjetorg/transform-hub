# Feature Request: Python Runner Wrapper

| Field | Value |
| ----- | ----- |
| Title | Python runner wrapper |
| Category | feature-request |
| Scope | packages/runner, packages/python-runner, packages/types, packages/host, packages/adapter-process, packages/adapter-docker, packages/adapter-kubernetes |
| Breaking | no |
| Status | completed |

## Problem Statement

After runner worker isolation, the host and adapters should not keep separate Node and Python runner tracks. Python sequence execution should live behind the runner executor boundary so the host launches one runner entrypoint regardless of sequence language.

## Current Behavior

- `packages/runner` is the Node runner entrypoint, while `packages/python-runner` is a separate Python executable package.
- The process adapter chooses between `@scramjet/runner` and `@scramjet/python-runner` based on `config.engines.python3`.
- The Kubernetes adapter chooses a Python or Node runner image based on sequence language.
- Runner startup metadata is passed through environment variables such as `SEQUENCE_PATH`, `SEQUENCE_INFO`, and `RUNNER_CONNECT_INFO`.
- Host-side telemetry and adapter logic still observe sequence language, but runner launch paths are split before the runner can choose a runtime executor.

## Expected Behavior

- `packages/runner` is the single host-facing executable for Node and Python sequences.
- The host and instance adapters launch the same runner entrypoint regardless of whether the sequence runs on Node or Python.
- Runtime selection happens inside `packages/runner` through the executor interface introduced by `013-feature-request-runner-worker-isolation.md`.
- `runner-python` replaces the current `python-runner` track as a runtime wrapper managed by the main runner.
- Python sequence wrappers receive execution metadata through the runner executor protocol, not inherited runner environment variables.
- Host APIs, stream channels, lifecycle messages, and sequence package contracts remain runtime-neutral.

## Proposed Change

1. Depend on `013-feature-request-runner-worker-isolation.md` so `packages/runner` already owns the host protocol and delegates sequence execution through a runtime-neutral executor interface.
2. Rename or replace the current `packages/python-runner` implementation with `runner-python`, making it a runtime wrapper invoked by `packages/runner` instead of a separate adapter-selected executable.
3. Move Node/Python runtime selection into `packages/runner`: inspect the sequence config/engines and choose `runner-node` or `runner-python` internally.
4. Remove Node/Python runner branching from host-facing launch paths:
   - `packages/adapter-process` should spawn `packages/runner` for both Node and Python sequences.
   - `packages/adapter-docker` should run a runner image whose entrypoint is `packages/runner`; runtime-specific dependencies can still differ by image variant.
   - `packages/adapter-kubernetes` should stop choosing runner behavior in host code and only select deployable runner image/config where infrastructure requires it.
5. Stop passing sequence execution data to wrappers via environment variables. Adapter-level environment may still provide runner process bootstrap values, but `runner-python` should receive sequence path, args, config, input/output handles, and lifecycle commands from the runner executor protocol.
6. Keep stdout/stderr, output, monitoring, and lifecycle behavior identical between `runner-node` and `runner-python` from the host perspective.
7. Preserve sequence language detection for packaging, telemetry, dependency resolution, and image selection, but do not let it leak into host-side runner control flow.
8. Document the runtime wrapper contract so future wrappers can be added without changing host or adapter code.

## Backwards Compatibility

No breaking changes for sequence authors or host API users. Existing Python sequences should continue to run, but the internal `@scramjet/python-runner` package path becomes an implementation detail replaced by `runner-python`.

## Testing Plan

- Unit test: runner selects `runner-python` for Python sequence config without host/adapters branching.
- Unit test: process adapter always launches the main runner executable and no longer resolves `@scramjet/python-runner` directly.
- Unit test: Kubernetes adapter does not choose runner behavior in host code; any image selection remains infrastructure-only and still starts the same runner entrypoint.
- Unit test: `runner-python` receives sequence metadata through the executor protocol, not `SEQUENCE_PATH`, `SEQUENCE_INFO`, or `RUNNER_CONNECT_INFO` environment variables.
- Integration test: existing Python sequence runs successfully through `packages/runner` and preserves stdout, stderr, output, monitoring, and lifecycle behavior.
- Regression test: host telemetry can still report sequence language without branching runner startup logic by language.
- Manual verification: run process-adapter scenarios for Node and Python sequences and confirm both spawn the same runner entrypoint while selecting different runtime wrappers internally.

## References

- `docs/roadmap/013-feature-request-runner-worker-isolation.md`
- `packages/runner/src/runner.ts`
- `packages/runner/src/bin/start-runner.ts`
- `packages/python-runner/runner.py`
- `packages/adapter-process/src/process-instance-adapter.ts`
- `packages/adapter-docker/src/docker-instance-adapter.ts`
- `packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts`
- `packages/adapters-common/src/get-runner-env.ts`

## Implementation Findings

### Architecture Decisions

- **Clean-slate package**: Built a new `packages/runner-python/` rather than refactoring the existing `packages/python-runner/`. The old package was deleted after a reference scan confirmed no remaining imports.
- **RuntimeExecutor interface**: Minimal shape `{ kind, spawn(opts) }` — no framework abstractions beyond what `child_process.spawn()` needs.
- **fd layout**: Identical to runner-node: fd 0/1/2 for stdio, fd 3 reserved as unused IPC, fd 4 for control, fd 5 for monitoring.
- **No Python request channel yet**: Unlike the Node wrapper, the Python runner does not open a request channel. Control and data flow exclusively through the dedicated fd4/fd5 pipes.
- **Boot config via JSON file**: Python wrapper receives sequence metadata as a JSON file path passed as the last CLI argument, matching the runner-node pattern. No sequence execution data flows through environment variables.
- **Legacy parity capture**: Built a capture harness at `packages/runner-python/tests/parity/capture.py` that records raw base64 channel bytes plus relative timestamps from the unmodified legacy runner. Golden fixtures are stored per-fixture-directory as `recorded.json` + `expected_summary.md`.
- **Parity capture injection**: Legacy runner was captured without source edits by injecting `sitecustomize.py` + `pyee` shims via `PYTHONPATH`. The `sitecustomize.py` workaround was necessary because Python 3.12 garbage-collects dropped `StreamWriter` objects early, causing CONTROL/IN/STDIN sockets to close prematurely during handshake.
- **Golden fixture determinism**: Recordings scrub absolute workspace/stdlib paths and strip debug-heavy log lines to keep goldens deterministic across environments. Stable determinism checks compare concatenated `OUT` bytes alongside sanitized `MONITORING` frames.
- **Shared contract types**: `RuntimeExecutor` interface and `PythonSpawnOptions` live in `packages/types/src/runtime-executor.ts` and are re-exported from the package index so both Node and Python wrappers share one canonical launch contract.
- **Architecture documentation**: Drafted `docs/architecture/runner-runtime-wrappers.md` as the contract reference covering executor selection, fd layout, boot config, and wrapper onboarding. Boot config schema references `packages/types/src/runtime-executor.ts`.

### Issues Encountered

1. **Legacy `SET` handling (unresolved, pre-existing)**: The legacy runner's `handle_set()` is an async coroutine called without `await`, producing `RuntimeWarning: coroutine 'Runner.handle_set' was never awaited` on STDERR. This is existing behaviour, not introduced by the wrapper.
2. **Legacy stop/kill exit via `sys.exit(1)` (unresolved, pre-existing)**: The legacy runner exits via `sys.exit(1)` from background tasks on stop/kill, producing non-zero exit codes and task-exception traces. Several parity fixtures intentionally capture this as current behaviour.
3. **Capture bootstrap on Python 3.12 (resolved)**: Legacy incoming-channel writers (`StreamWriter` objects for CONTROL/IN/STDIN) were garbage-collected early under Python 3.12, causing socket closure during handshake. Fixed by keeping writer references alive through `sitecustomize.py`.
4. **Absolute path noise in goldens (resolved)**: Workspace and stdlib absolute paths leaked into golden recordings, making them system-dependent. Scrubbed during capture to produce deterministic fixtures.

### Current State

- `packages/runner-python/` created as a clean-slate package.
- `packages/python-runner/` deleted.
- `RuntimeExecutor` interface defined in `packages/types`.
- Legacy parity capture harness functional with golden fixtures.
- Architecture reference doc drafted.
- End-to-end integration (runner selecting runner-python for Python sequences, adapters no longer branching by language) and BDD verification are the remaining work items.

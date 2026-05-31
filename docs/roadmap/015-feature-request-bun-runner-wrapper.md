# Feature Request: Bun Runner Wrapper

| Field | Value |
| ----- | ----- |
| Title | Bun runner wrapper |
| Category | feature-request |
| Scope | packages/runner, packages/types, packages/host, packages/adapter-process, packages/adapter-docker, packages/adapter-kubernetes |
| Breaking | no |

## Problem Statement

After the runner executor boundary exists, Bun support should be added as another runtime wrapper rather than another host/adapters runner track. The host should remain oblivious to whether sequence code is executed by Node, Python, Bun, or a future runtime.

## Current Behavior

- There is no Bun sequence runtime wrapper.
- Node sequence execution is handled by `packages/runner`, and Python has a separate `packages/python-runner` executable track.
- Adding Bun directly to host/adapters would repeat the existing split-runtime plumbing and require new language-specific launch branches.
- Runner startup metadata is currently tied to environment-variable handoff instead of a runtime-neutral executor protocol.

## Expected Behavior

- `runner-bun` is introduced as a runtime wrapper managed by `packages/runner`.
- The host and instance adapters continue launching the same `packages/runner` executable for Bun sequences.
- Runtime selection happens inside `packages/runner` through the executor interface introduced by `013-feature-request-runner-worker-isolation.md`.
- Bun sequence wrappers receive execution metadata through the runner executor protocol, not inherited runner environment variables.
- Bun stdout/stderr, output, monitoring, lifecycle, completion, and failure reporting use the same host-visible semantics as `runner-node` and `runner-python`.

## Proposed Change

1. Depend on `013-feature-request-runner-worker-isolation.md` for the executor protocol and `014-feature-request-python-runner-wrapper.md` for the host/adapters single-runner direction.
2. Add `runner-bun` as a runtime wrapper package or module implementing the same executor protocol as `runner-node` and `runner-python`.
3. Extend runtime selection inside `packages/runner` to choose `runner-bun` for Bun-backed sequence configs/engines.
4. Ensure `runner-bun` receives sequence path, args, config, input/output handles, lifecycle commands, and failure-reporting channels through the executor protocol rather than process environment variables.
5. Keep host and adapter launch paths unchanged: they should still start `packages/runner`, not a Bun-specific executable.
6. Define Bun packaging/runtime requirements separately from host behavior, including how Bun dependencies and sequence entrypoints are detected and prepared.
7. Forward Bun stdout/stderr into the existing host STDOUT/STDERR streams without mutating parent runner stdio.
8. Document Bun-specific limitations, such as supported module formats, TypeScript handling, dependency install expectations, and any runtime flags needed by the wrapper.

## Backwards Compatibility

No breaking changes. Existing Node and Python sequences continue to use their runtime wrappers, and Bun support is additive.

## Testing Plan

- Unit test: runner selects `runner-bun` for Bun sequence config without host/adapters branching.
- Unit test: `runner-bun` receives sequence metadata through the executor protocol, not `SEQUENCE_PATH`, `SEQUENCE_INFO`, or `RUNNER_CONNECT_INFO` environment variables.
- Unit test: Bun stdout and stderr are forwarded to separate host STDOUT/STDERR streams without mutating parent `process.stdout` or `process.stderr`.
- Integration test: Bun-backed sequence runs successfully through `packages/runner` and produces output through the same host endpoints as Node sequences.
- Integration test: Bun-backed sequence failure is reported as a structured sequence failure while the runner control-plane remains able to relay diagnostics.
- Manual verification: run process-adapter Bun sequence scenarios and confirm the spawned executable is still the main runner entrypoint.

## References

- `docs/roadmap/013-feature-request-runner-worker-isolation.md`
- `docs/roadmap/014-feature-request-python-runner-wrapper.md`
- `packages/runner/src/runner.ts`
- `packages/runner/src/bin/start-runner.ts`
- `packages/adapter-process/src/process-instance-adapter.ts`
- `packages/adapter-docker/src/docker-instance-adapter.ts`
- `packages/adapter-kubernetes/src/kubernetes-instance-adapter.ts`

# Bugfix: Node 22 plus Wasm Under Hard ulimit

| Field | Value |
|-------|-------|
| Title | Fix Node 22 plus Wasm failure under hard ulimit |
| Category | bugfix |
| Scope | packages/runner, packages/host |
| Breaking | no |

## Problem Statement

Node 22 changed how V8 reserves virtual memory for WebAssembly. When the process runs under a hard virtual-memory limit such as `ulimit -v 4194304` (4 GiB, expressed in KiB), Wasm initialization can fail with an out-of-memory error even though the actual working set is far smaller.

## Current Behavior

- STH or a Sequence that uses Wasm crashes on Node 22 when a strict `ulimit -v` is in effect.
- The error message varies but typically reports `RangeError: WebAssembly.Instance(): Out of memory: Cannot allocate Wasm memory for new instance`.
- This breaks CI environments and hardened production containers that set resource limits via `ulimit`.

## Expected Behavior

- STH and its runners start reliably on Node 22 under typical `ulimit` constraints.
- If a Node or V8 runtime option is required, it should be documented and optionally applied by the launcher.

## Proposed Change

1. Detect Node 22 at STH startup and warn if a low `ulimit -v` is detected.
2. For the process adapter, document and apply only supported Node/V8 options that reduce virtual-memory reservation under constrained environments.
3. Document the interaction in troubleshooting so operators can choose between relaxing `ulimit -v` or switching to `ulimit -m` (resident set limit) instead.

## Backwards Compatibility

No breaking changes. Detection and warnings are additive.

## Testing Plan

- Manual test: start STH under `ulimit -v 4194304` on Node 22 and verify it does not crash.
- Integration test: deploy a Sequence that imports a Wasm module and assert it starts under the restricted environment.

## References

- Node.js 22 release notes and V8 memory reservation changes
- `packages/runner/src/runner.ts`
- `packages/host/src/lib/csi-controller.ts`

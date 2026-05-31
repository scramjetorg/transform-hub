# decisions.md - Python Runner Wrapper

## Architectural Decisions
- Clean-slate Python package at `packages/runner-python/`
- `packages/python-runner/` deleted after reference scan
- RuntimeExecutor interface: `{ kind, spawn(opts) }` only - no framework bloat
- fd layout: 0/1/2 stdio, fd3 reserved IPC, fd4 control, fd5 monitoring
- Python does NOT use REQUESTS/BPMux channel
- boot-config via JSON file path as last CLI arg

## 2026-05-31 parity capture decisions
- Capture harness lives at `packages/runner-python/tests/parity/capture.py` and writes `recorded.json` plus `expected_summary.md` directly into each fixture directory.
- Parity capture runs the unmodified legacy runner with `sitecustomize.py` and `pyee` shims injected through `PYTHONPATH` rather than patching `packages/python-runner`.
- Golden fixtures record raw base64 channel bytes plus relative timestamps, and stable determinism checks compare concatenated `OUT` bytes together with sanitized `MONITORING` frames.
- Shared runtime wrapper contract lives in `packages/types/src/runtime-executor.ts` and is re-exported from `packages/types/src/index.ts`
- `PythonSpawnOptions` is a documented interface extending `SpawnOptions` so Node and Python wrappers share one canonical launch contract and the symbol survives declaration emit

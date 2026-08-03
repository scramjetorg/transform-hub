# Feature Request: Python Self-Contained Packaging

| Field | Value |
| ----- | ----- |
| Title | Python self-contained packaging |
| Category | feature-request |
| Scope | packages/pre-runner, packages/runner-python, packages/types, packages/adapter-process, packages/adapter-docker, packages/adapter-kubernetes, packages/sth-config |
| Breaking | no |

## Problem Statement

The approved Python runner-wrapper plan keeps sequence packaging unchanged and still relies on path-based dependency resolution such as `PYTHONPATH` and `__pypackages__`. Python sequence artifacts should be able to carry a reproducible, self-contained runtime environment built from a lockfile-driven workflow so runner launch does not depend on ad-hoc Python path injection.

## Current Behavior

- Process-mode Python launch injects `PYTHONPATH` by combining runner package dependencies with sequence-local `__pypackages__`.
- Python container images install runner dependencies directly into the image rather than consuming a sequence-owned self-contained bundle.
- The approved `runner-python` plan explicitly keeps pre-runner and sequence packaging unchanged.
- There is no first-class lockfile-based Python packaging workflow in the sequence artifact contract.

## Expected Behavior

- Python sequence artifacts can be prepared as self-contained bundles for their target runtime environment.
- Dependency resolution is reproducible from a checked-in lockfile and does not rely on runtime `PYTHONPATH` composition.
- `runner-python` can locate and activate the packaged Python environment through artifact metadata rather than through implicit path conventions.
- Process, Docker, and Kubernetes execution paths can all consume the same packaging contract, with any platform-specific constraints explicitly documented.

## Proposed Change

1. Depend on `014-feature-request-python-runner-wrapper.md` so `runner-python` already owns Python runtime boot and metadata consumption.
2. Introduce a packaging contract for Python sequence artifacts that records interpreter/environment metadata instead of requiring runtime `PYTHONPATH` injection.
3. Add a lockfile-driven Python build workflow, with `uv` as the preferred implementation target or an equivalent reproducible environment bundler if repository constraints require it.
4. Build and package a self-contained Python environment for the target runtime, rather than relying on sequence-local `__pypackages__` at launch time.
5. Update process, Docker, and Kubernetes runtime paths to consume the packaged environment metadata consistently.
6. Preserve a migration path for existing Python sequences that still use the current path-based approach until the new artifact contract is stable.
7. Document platform and ABI constraints explicitly, especially for process mode and native Python dependencies.

## Backwards Compatibility

No breaking changes in the initial rollout. The self-contained packaging workflow should be additive first, with an explicit migration path from the existing `PYTHONPATH`/`__pypackages__` behavior.

## Testing Plan

- Unit test: pre-runner or packaging step emits the expected environment metadata for a Python sequence artifact.
- Unit test: `runner-python` locates and uses the packaged environment without requiring `PYTHONPATH` injection.
- Integration test: a packaged Python sequence runs successfully in process mode without sequence-level `PYTHONPATH` composition.
- Integration test: the same packaged artifact runs through Docker/Kubernetes using the documented image/runtime contract.
- Regression test: existing Python sequences using the legacy path-based packaging mode continue to run during the migration period.

## References

- `docs/roadmap/014-feature-request-python-runner-wrapper.md`
- `packages/adapter-process/src/process-instance-adapter.ts`
- `packages/runner/src/bin/start-runner.ts`
- `packages/python-runner/requirements.txt`
- `docker/packages/Dockerfile.runner-py`

# Feature Request: Python ASGI/WSGI Exposure

| Field | Value |
| ----- | ----- |
| Title | Python ASGI/WSGI exposure |
| Category | feature-request |
| Scope | packages/runner-python, packages/runner, packages/types, packages/api-server, packages/host |
| Breaking | no |

## Problem Statement

Once Python sequences run behind `runner-python`, they should be able to expose HTTP application surfaces the same way Node sequences can expose runtime-owned HTTP endpoints. Python needs a first-class exposure path for ASGI and, where practical, WSGI apps, without reintroducing host/adapters language-specific launch behavior.

## Current Behavior

- The approved Python runner-wrapper plan explicitly excludes Python REQUESTS/BPMux and does not add a Python `context.api` or equivalent exposed-HTTP surface.
- Python sequences can process streams and lifecycle events, but they do not have a runtime-owned ASGI/WSGI serving contract.
- Node runtime behavior includes a sequence-local API server path, but Python has no equivalent.
- Python developers must run their own sidecar or bind their own server manually if they want HTTP exposure.

## Expected Behavior

- Python sequences can opt into HTTP exposure through `runner-python` without changing host or adapter launch paths.
- ASGI apps are supported as the primary async-native path.
- WSGI apps are either supported directly or through an explicit compatibility bridge with documented limitations.
- Exposed Python HTTP routes use the same host-visible instance exposure semantics as other runtime wrappers.
- Startup, shutdown, stop ordering, health reporting, and diagnostics remain consistent with the runner lifecycle contract.

## Proposed Change

1. Depend on `014-feature-request-python-runner-wrapper.md` so Python already executes behind `runner-python`.
2. Depend on `016-feature-request-python-hub-api-client.md` first so Python has the prerequisite runtime-side HTTP/client plumbing separated from full server exposure.
3. Extend the runtime-wrapper contract with Python HTTP exposure metadata and lifecycle rules.
4. Implement ASGI support first as the primary async-native runtime path.
5. Add WSGI support as either a secondary explicit mode or a documented compatibility layer, with clear limitations around concurrency and lifecycle.
6. Define the Python-facing registration contract: how a sequence declares an app to expose, how bind/expose settings are supplied, and how shutdown is coordinated with runner lifecycle signals.
7. Keep host and adapter behavior runtime-neutral: they continue to launch `packages/runner`, not a Python-specific server executable.
8. Document the differences between ASGI and WSGI behavior, including lifecycle hooks, concurrency model, and error propagation expectations.

## Backwards Compatibility

No breaking changes. Existing Python sequences without exposed HTTP apps continue to run unchanged. Exposure remains opt-in.

## Testing Plan

- Unit test: `runner-python` accepts and validates Python exposure configuration for ASGI mode.
- Unit test: WSGI mode either validates successfully with the compatibility bridge or fails with a documented unsupported-capability error.
- Integration test: an ASGI app runs through `runner-python` and responds through the host-visible exposure path.
- Integration test: a WSGI app runs through the documented compatibility mode and preserves shutdown/lifecycle behavior.
- Regression test: non-exposing Python sequences preserve stream, monitoring, and lifecycle parity.

## References

- `docs/roadmap/014-feature-request-python-runner-wrapper.md`
- `docs/roadmap/016-feature-request-python-hub-api-client.md`
- `packages/runner-node/src/context.ts`
- `packages/runner-node/src/runner-app-context.ts`
- `packages/runner-node/src/bin/runner-node.ts`
- `packages/runner-python/runner.py`

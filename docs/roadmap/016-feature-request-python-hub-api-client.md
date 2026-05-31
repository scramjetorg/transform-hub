# Feature Request: Python Hub API Client Parity

| Field | Value |
| ----- | ----- |
| Title | Python hub API client parity |
| Category | feature-request |
| Scope | packages/runner-python, packages/runner, packages/types, packages/host |
| Breaking | no |

## Problem Statement

After `runner-python` exists behind the main runner executor boundary, Python sequences should be able to call hub endpoints and related host APIs without also needing to expose their own HTTP server. Node sequences already have a sequence-local host client path; Python should gain the same capability as a runtime concern rather than as a host/adapters branch.

## Current Behavior

- `packages/runner-node` builds a sequence-local host API client using the REQUESTS channel and BPMux-backed transport.
- The approved Python runner-wrapper direction explicitly excludes REQUESTS/BPMux for Python and only gives Python direct `IN`, `OUT`, and `LOG` host channels plus fd-based control and monitoring.
- Python sequences therefore cannot call hub endpoints through a first-class runtime client the way Node sequences can.
- Any Python sequence that needs host-facing HTTP interaction today must work around the runtime boundary externally rather than through the runner contract.

## Expected Behavior

- Python sequences can call hub endpoints and other supported host APIs through a sequence-local runtime client without exposing an HTTP server.
- The host and adapters still launch the same `packages/runner` executable; this remains a runtime-wrapper concern inside `runner-python`.
- The Python client transport uses the same host-facing semantics and authentication/runtime metadata model as the Node path, while staying internal to the wrapper contract.
- This capability is additive: Python sequences that do not use host API clients are unaffected.

## Proposed Change

1. Depend on `014-feature-request-python-runner-wrapper.md` so Python already runs behind `runner-python` as a dedicated runtime wrapper.
2. Introduce a Python-side request transport for host API calls as an internal wrapper capability rather than a host/adapters behavior change.
3. Extend the runtime-wrapper contract to define how Python opens and owns a REQUESTS-equivalent channel, including lifecycle, shutdown, and failure reporting expectations.
4. Add Python client helpers for hub endpoints and other supported host APIs, mirroring the supported Node runtime surface where practical.
5. Keep this work separate from Python HTTP exposure: calling hub endpoints must not require WSGI/ASGI server support.
6. Document which Node runtime capabilities are intentionally in-scope for parity (for example, hub/space access) and which remain out of scope.

## Backwards Compatibility

No breaking changes. Existing Python sequences continue to run without using the new client surface. The feature is opt-in and additive.

## Testing Plan

- Unit test: `runner-python` opens the Python request transport only when the Python host API client feature is enabled.
- Unit test: Python host API client requests are transported through the wrapper contract rather than through ad-hoc outbound HTTP configuration.
- Integration test: a Python sequence calls a hub endpoint successfully through the runtime client path.
- Integration test: request-transport failure is reported as a sequence/runtime error without taking down the outer runner control plane.
- Regression test: Python sequences that do not use the host API client retain the current `IN`/`OUT`/`LOG` and lifecycle behavior.

## References

- `docs/roadmap/014-feature-request-python-runner-wrapper.md`
- `packages/runner-node/src/host-client.ts`
- `packages/runner-node/src/context.ts`
- `packages/runner-python/runner.py`
- `packages/runner/src/bin/start-runner.ts`

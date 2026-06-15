# Specification: runner-python sequence format parity

## Overview

Bring `packages/runner-python` sequence execution to the new Python runtime contract and platform parity expectations established by the verser2 rollout. The work should define and implement the new Python sequence shape, add Node-style AppContext capabilities with Pythonic naming, align input/output format handling, and replace legacy Python BDD reference-app assumptions with minimal new-contract refapps after the runtime behavior is ready.

The primary new Python entrypoint should be `main(context, input_stream, *args)`. The existing `run(context, input_stream, *args)` loader behavior should remain as a transitional alias/fallback for compatibility with the current runner-python proposal, but new docs, tests, and BDD refapps should prefer `main`.

A legacy compatibility structure may be added only at the end of the plan. It is for best-effort execution of old Python sequences, remains unsupported, and must not drive the primary implementation design.

## Track Type

Feature / runtime parity follow-up.

## Context

Scramjet Transform Hub is a runtime supervisor for Transform Sequences across process, Docker, and Kubernetes adapters. Runtime wrappers must remain protocol-compatible and testable while preserving the outer runner boot config, fd/control/monitoring protocol, and Hub/CLI-visible API, log, health, event, and topic semantics.

The current verser2 rollout has migrated Python runtime connectivity, ASGI exposure, and Python hub client support, but Python BDD validation was intentionally deferred. Current runner-python code and tests propose `run(...)`; this track intentionally promotes `main(...)` as the clearer primary contract while preserving `run(...)` as a transition path.

## Functional Requirements

### New Python sequence contract

- Define and document the primary Python sequence entrypoint as:

  ```python
  async def main(context, input_stream, *args):
      ...
  ```

- Preserve `run(context, input_stream, *args)` as a transitional alias/fallback because current runner-python already loads and invokes `run`.
- Define deterministic loader precedence when both `main` and `run` are present; prefer `main` and warn or document the behavior clearly.
- Support returns and yielded values including `None`, `str`, `bytes`, JSON-serializable values, sync iterables, async iterables, and awaitables resolving to any supported result shape.
- Keep Python `main()`/`run()` as a clean single-entrypoint contract; do not copy Node array/chained-function sequence execution unless an explicit need is discovered and approved.

### Python AppContext parity

- Add Pythonic, snake_case equivalents that map closely to Node AppContext behavior: `context.config`, `context.instance_id`, `context.logger`, `context.api`, `context.hub`, `context.local_storage` when feasible or documented as deferred, stop/kill/monitoring handlers, keepalive, end/destroy, events, describe/save, and initial state.
- Prefer Node-style monitoring handlers for health behavior:

  ```python
  context.add_monitoring_handler(lambda: {"healthy": False})
  ```

- Do not treat old APIs such as `set_health_check`, `set_stop_handler`, old `scramjet.streams.Stream`, or legacy module-global refapp assumptions as the primary contract.

### Input/output and sequence format parity

- Align Python input parsing and output emission with platform-visible runtime parity, including text, binary, JSON-serializable values, `application/x-ndjson`, sync/async iterable outputs, awaitable returns, and content-type metadata propagation where supported.
- Preserve Hub/CLI-visible API/log/health/event/topic semantics while changing Python sequence internals.
- Ensure terminal monitoring, completion, stop, and kill behavior are externally aligned with Node/Bun/Python platform expectations.

### Topic and metadata conventions

- Define one canonical Python metadata convention for topics using snake_case, for example:

  ```python
  requires = {"topic": "topic-test", "content_type": "text/plain"}
  provides = {"topic": "topic-test", "content_type": "text/plain"}
  ```

- Map metadata to existing Hub/CLI-visible topic behavior without preserving legacy metadata shapes as the primary API.
- Optional runtime-owned wrappers such as `runner_python.Output` may be introduced only if they simplify the new contract and are covered by tests.

### New Python BDD reference apps

- After the new runtime contract and parity behavior are implemented, replace Python BDD-specific refapps with minimal examples that use `main(...)`, the new API, and no `scramjet-framework-py` dependency.
- Cover exception stderr, text input, binary input, NDJSON input/output, health override through monitoring handlers, logger forwarding, topic metadata, async generator output, stop/keep_alive behavior, kill handler behavior, events, and ASGI API exposure.

### Legacy compatibility structure

- Add legacy compatibility only as the final implementation phase.
- The compatibility structure may allow old Python sequences to run on a best-effort basis, but it is unsupported.
- The compatibility structure must not influence the design of the new primary runtime contract.
- Strict new API behavior is preferred; legacy aliases or shims should be minimal, isolated, and clearly documented as unsupported if added.

## Non-Functional Requirements

- Preserve the outer runner boot config contract and fd/control/monitoring protocol.
- Preserve platform-level behavior visible from Hub/CLI/API for logs, health, lifecycle, events, topics, input, output, and API exposure.
- Keep implementation incremental, package-local where possible, and test-conscious.
- Prefer focused runner-python tests before broad BDD validation.
- Avoid adding dependencies on `scramjet-framework-py` for new BDD refapps.
- Do not run or rely on Python BDD as a gate until the runtime contract and replacement refapps are complete.

## Acceptance Criteria

- `packages/runner-python` documents `main(context, input_stream, *args)` as the primary Python sequence contract and `run(...)` as a transitional alias/fallback.
- Loader tests define behavior for `main` only, `run` only, and both `main` and `run` present.
- Python AppContext exposes the new snake_case Node-parity API listed in this spec, or any deferred item is explicitly documented with rationale.
- Python runtime tests cover full format parity, including NDJSON, text, binary, JSON values, sync/async iterables, async generators, and awaitables.
- Health uses `add_monitoring_handler` in new examples and tests.
- Logger forwarding, events, topic metadata, stop, kill, keep_alive, `end`, and `destroy` behavior are covered by focused tests where applicable.
- New Python BDD refapps use `main(...)`, the new contract, and avoid `scramjet-framework-py`.
- Validation follows staged gates: runner-python package tests/build first, then targeted BDD refapp updates, then Python BDD smoke as final validation.
- Any legacy compatibility layer is implemented last, isolated from the primary new API, and documented as unsupported.

## Out of Scope

- Reworking the outer runner boot config, fd/control/monitoring protocol, or adapter launch contract.
- Replacing Node or Bun runtime APIs.
- Making old `scramjet.streams.Stream`, `set_health_check`, `set_stop_handler`, or legacy module-global Python APIs the primary supported contract.
- Treating Python BDD failures as blockers before the new runtime contract and replacement refapps are complete.
- Implementing code during track creation.

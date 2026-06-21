# Plan: runner-python sequence format parity

## Phase 1: Entrypoint Contract Definition and Baseline Coverage

- [x] Task: Confirm runner-python current behavior and entrypoints
    - [x] Read `packages/runner-python/codemap.md` and current runner-python source entrypoints for boot config, AppContext, sequence loading, input/output handling, lifecycle, monitoring, logging, events, topics, and API exposure.
    - [x] Read the relevant verser2 rollout notes for current Python runtime migration state and deferred Python BDD blockers.
    - [x] Identify current `run(...)` loader behavior and current parity fixtures using `run` in `main.py`.
    - [x] Identify current legacy API assumptions, including `scramjet.streams.Stream`, `set_health_check`, `set_stop_handler`, legacy metadata shapes, and module-global refapp behavior.
    - [x] Record the current behavior and gaps in the track notes or implementation summary before changing runtime behavior.
- [x] Task: Define the new Python sequence contract
    - [x] Document `main(context, input_stream, *args)` as the primary supported entrypoint.
    - [x] Document `run(context, input_stream, *args)` as a transitional alias/fallback for the current runner-python proposal.
    - [x] Define loader precedence for `main` only, `run` only, and both present; prefer `main` when both are available.
    - [x] Document supported result shapes: `None`, `str`, `bytes`, JSON-serializable values, sync iterable, async iterable, and awaitables resolving to supported shapes.
    - [x] Document input stream expectations and content-type behavior, including text, binary, JSON values, and `application/x-ndjson`.
    - [x] Document canonical snake_case topic metadata conventions for `requires` and `provides`.
    - [x] Explicitly document unsupported or non-primary legacy APIs without implementing compatibility yet.
- [x] Task: Add baseline focused tests for the entrypoint contract
    - [x] Add or update runner-python loader tests for `main` only.
    - [x] Add or update runner-python loader tests for `run` only as a transitional alias/fallback.
    - [x] Add or update runner-python loader tests proving `main` takes precedence when both `main` and `run` are present.
    - [x] Add failing or pending-focused tests for supported return shapes and input parsing behavior (deferred to Phase 3; existing `as_output_stream`/`resolve_sequence_result` tests remain).
    - [x] Add tests for canonical topic metadata parsing/mapping.
    - [x] Add tests proving old APIs are not required for new-contract refapps (test_utils.py verifies new snake_case metadata independently of legacy paths).
    - [x] Run `npm test -- tests/<focused-runner-python-tests> -v` in `packages/runner-python` or the narrowest equivalent focused command.
- [ ] Task: Conductor - User Manual Verification 'Entrypoint Contract Definition and Baseline Coverage' (Protocol in workflow.md)

### Implementation notes (Phase 1, 2026-06-21)

**Changes made:**

- `sequence_loader.py`: `load_sequence` now resolves `main` as the primary
  entrypoint with `run` as transitional fallback. Non-callable `main` raises
  `SequenceLoadError` even when `run` is available. Added `entrypoint_name`
  field to `SequenceModule`. Error messages reference both `main` and `run`.
- `utils.py`: Added `_topic_from_meta()` and `_content_type_from_meta()`
  helpers. Updated `get_input_content_type`, `get_output_content_type`, and
  `build_runtime_pangs` to support canonical snake_case keys
  (`topic`, `content_type`) alongside legacy camelCase keys. Snake_case takes
  precedence when both are present.
- `__main__.py`: No changes needed — `SequenceModule.run` still points to the
  selected callable.
- `test_sequence_loader.py`: Updated error-message assertions for new wording.
  Added 7 new tests: `main_only`, `run_only_fallback`, `main_precedence`,
  `non_callable_main_with_callable_run`, `non_callable_main_without_run`,
  `entrypoint_name_main`, `entrypoint_name_run`.
- `test_utils.py` (new): 14 focused tests for snake_case metadata parsing,
  legacy compatibility, precedence rules, and edge cases.
- `README.md`: Full Phase 1 contract documentation covering entrypoint
  signatures, precedence table, result shapes, input content-types, canonical
  metadata, and legacy API status.

**Deferred considerations:**
- `application/x-ndjson` input parsing (Phase 3).
- Comprehensive return-shape integration tests through the runtime path
  (partially covered by existing `output_stream` tests; full result
  normalisation integration deferred).
- Old `<app>/main.py` parity fixtures using `run` only — these continue to
  work via the fallback path.
- Backward compatibility of result-object-based requires/provides overrides
  is preserved (`result.provides`, `result.requires`, `result.content_type`).

**Validation:**
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm test -- tests/test_sequence_loader.py tests/test_utils.py tests/test_input_stream.py tests/test_output_stream.py` in `packages/runner-python`: 58 passed.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm test` in `packages/runner-python`: 203 passed.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm run build` in `packages/runner-python`: passed.

**Review notes:**
- Oracle review found and the implementation fixed: `main = None` now raises instead of falling back to `run`; README now states NDJSON input parsing is deferred to Phase 3; sync iterable output normalization is implemented and tested; empty topic-only metadata no longer emits PANG frames.

**Phase checkpoint commit:** `f76ed59a` (`feat(runner-python): define main entrypoint contract`).

## Phase 2: AppContext Parity and Lifecycle Semantics

- [ ] Task: Implement Node-style Python AppContext API
    - [ ] Add or align `context.config`, `context.instance_id`, `context.logger`, `context.api`, `context.hub`, and `context.initial_state`.
    - [ ] Add `context.add_stop_handler(fn)`, `context.add_kill_handler(fn)`, and `context.add_monitoring_handler(fn)`.
    - [ ] Add `context.keep_alive(milliseconds=0)`, `context.end()`, and `context.destroy(error=None)` with externally compatible lifecycle behavior.
    - [ ] Add `context.on(event_name, handler)`, `context.emit(event_name, message=None)`, and `context.emit_to_space(event_name, message=None)`.
    - [ ] Add `context.describe(definition)` and `context.save(state)` where supported by the current protocol.
    - [ ] Add `context.local_storage` only if it can be implemented safely; otherwise document the deferral and preserve tests for the documented behavior.
- [ ] Task: Cover lifecycle, monitoring, health, logging, and event parity
    - [ ] Add tests for `add_monitoring_handler()` health payload composition and terminal monitoring behavior.
    - [ ] Add tests for stop handlers, kill handlers, `keep_alive()`, `end()`, and `destroy()`.
    - [ ] Add tests for logger forwarding at the levels expected by Hub/CLI-visible behavior.
    - [ ] Add tests for event subscription, instance event emission, and space event emission.
    - [ ] Add tests for state description/save/initial-state behavior where implemented.
- [ ] Task: Validate AppContext parity
    - [ ] Run focused runner-python AppContext/lifecycle tests.
    - [ ] Run full `npm test` in `packages/runner-python`.
    - [ ] Run `npm run build` in `packages/runner-python`.
    - [ ] Record any intentionally deferred AppContext fields or behavior with rationale.
- [ ] Task: Conductor - User Manual Verification 'AppContext Parity and Lifecycle Semantics' (Protocol in workflow.md)

## Phase 3: Input/Output Format Parity and Metadata

- [ ] Task: Implement input parsing parity
    - [ ] Support text input streams without breaking existing protocol framing.
    - [ ] Support binary input streams without lossy encoding conversions.
    - [ ] Support JSON-compatible input where the current runner protocol provides JSON content.
    - [ ] Add `application/x-ndjson` parsing with item-by-item semantics and malformed-line error behavior documented by tests.
    - [ ] Preserve backpressure and streaming behavior; avoid mandatory full buffering for large inputs.
- [ ] Task: Implement output/result normalization parity
    - [ ] Normalize `None`, `str`, `bytes`, JSON-serializable values, sync iterables, async iterables, async generators, and awaitables to runner output frames.
    - [ ] Preserve binary payloads and text encoding boundaries.
    - [ ] Emit NDJSON output consistently for `application/x-ndjson` where metadata or content type requests it.
    - [ ] Preserve completion, error, stderr, and terminal monitoring semantics for each output shape.
    - [ ] Introduce a runtime-owned output wrapper such as `runner_python.Output` only if needed for topic/content-type clarity, and cover it with tests if added.
- [ ] Task: Implement canonical metadata handling
    - [ ] Parse snake_case `requires` and `provides` metadata for topic and `content_type` values.
    - [ ] Map canonical metadata to existing Hub/CLI-visible topic behavior.
    - [ ] Add tests for topic rename/content-type behavior using the new metadata convention.
    - [ ] Document legacy metadata behavior as non-primary and defer compatibility handling to Phase 5.
- [ ] Task: Validate format and metadata parity
    - [ ] Run focused runner-python format and metadata tests.
    - [ ] Run full `npm test` in `packages/runner-python`.
    - [ ] Run `npm run build` in `packages/runner-python`.
    - [ ] Run `npm run check:runtime-invariants` if runtime protocol wording or invariant coverage changes.
- [ ] Task: Conductor - User Manual Verification 'Input/Output Format Parity and Metadata' (Protocol in workflow.md)

## Phase 4: New Python BDD Refapps and Final Runtime Validation

- [ ] Task: Replace Python BDD refapps with new-contract examples
    - [ ] Create or update Python BDD refapps for exception stderr, text input, binary input, NDJSON input/output, health override, logger forwarding, topics, async generator output, stop/keep_alive, kill handler, events, and ASGI API exposure.
    - [ ] Ensure new Python BDD refapps use `main(context, input_stream, *args)` and the new AppContext API.
    - [ ] Ensure new Python BDD refapps do not depend on `scramjet-framework-py`.
    - [ ] Keep BDD scenario intent stable while changing Python refapp internals.
- [ ] Task: Run staged validation gates
    - [ ] Run full `npm test` in `packages/runner-python`.
    - [ ] Run `npm run build` in `packages/runner-python`.
    - [ ] Run `npm run build:packages` if package-level changes affect shared build output.
    - [ ] Run `npm run check:runtime-invariants`.
    - [ ] Run targeted BDD paths needed for the changed Python refapps.
    - [ ] Run `npm run test:bdd-ci-python` as the final Python runtime smoke gate.
    - [ ] Record any skipped broad Docker/Kubernetes validation and reason.
- [ ] Task: Complete runtime parity review
    - [ ] Review Python behavior against Node/Bun platform-visible semantics for logs, health, lifecycle, events, topics, input, output, and ASGI API exposure.
    - [ ] Confirm no new refapp depends on old `scramjet.streams.Stream`, old health/stop APIs, or legacy module-global assumptions.
    - [ ] Confirm docs, tests, and runtime behavior describe the same Python contract.
- [ ] Task: Conductor - User Manual Verification 'New Python BDD Refapps and Final Runtime Validation' (Protocol in workflow.md)

## Phase 5: Isolated Legacy Compatibility Structure

- [ ] Task: Design minimal unsupported compatibility boundary
    - [ ] Identify the smallest isolated shim needed for old Python sequences to run best-effort without changing the new primary runtime contract.
    - [ ] Keep compatibility out of new AppContext and new refapp implementation paths unless explicitly documented as an alias layer.
    - [ ] Define unsupported behavior and failure modes for old `scramjet.streams.Stream`, old health/stop APIs, legacy metadata shapes, and legacy module-global assumptions.
- [ ] Task: Implement isolated compatibility shims last
    - [ ] Add loader or adapter shims for legacy sequences only after all new-contract tests and BDD refapps are complete.
    - [ ] Keep any aliases such as old health/stop helpers minimal and clearly marked unsupported if added.
    - [ ] Add tests proving compatibility shims do not affect new-contract behavior.
    - [ ] Add tests for a small representative set of old sequence shapes that should still run best-effort.
- [ ] Task: Validate compatibility isolation
    - [ ] Run focused compatibility and new-contract regression tests.
    - [ ] Run full `npm test` in `packages/runner-python`.
    - [ ] Run `npm run build` in `packages/runner-python`.
    - [ ] Run `npm run test:bdd-ci-python` or document why compatibility-only changes do not require rerunning the full smoke gate.
    - [ ] Update documentation to state that legacy compatibility is unsupported and not the primary contract.
- [ ] Task: Conductor - User Manual Verification 'Isolated Legacy Compatibility Structure' (Protocol in workflow.md)

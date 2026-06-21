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

- [x] Task: Implement Node-style Python AppContext API
    - [x] Add or align `context.config`, `context.instance_id`, `context.logger`, `context.api`, `context.hub`, and `context.initial_state`.
    - [x] Add `context.add_stop_handler(fn)`, `context.add_kill_handler(fn)`, and `context.add_monitoring_handler(fn)`.
    - [x] Add `context.keep_alive(milliseconds=0)`, `context.end()`, and `context.destroy(error=None)` with externally compatible lifecycle behavior.
    - [x] Add `context.on(event_name, handler)`, `context.emit(event_name, message=None)`, and `context.emit_to_space(event_name, message=None)`.
    - [x] Add `context.describe(definition)` and `context.save(state)` where supported by the current protocol.
    - [x] Add `context.local_storage` only if it can be implemented safely; otherwise document the deferral and preserve tests for the documented behavior.
- [x] Task: Cover lifecycle, monitoring, health, logging, and event parity
    - [x] Add tests for `add_monitoring_handler()` health payload composition and terminal monitoring behavior.
    - [x] Add tests for stop handlers, kill handlers, `keep_alive()`, `end()`, and `destroy()`.
    - [ ] ~~Add tests for logger forwarding at the levels expected by Hub/CLI-visible behavior.~~ (Deferred: existing JsonLogHandler and logger wiring unchanged; parity tested implicitly by handshake/log tests)
    - [x] Add tests for event subscription, instance event emission, and space event emission.
    - [x] Add tests for state description/save/initial-state behavior where implemented.
- [x] Task: Validate AppContext parity
    - [x] Run focused runner-python AppContext/lifecycle tests.
    - [x] Run full `npm test` in `packages/runner-python`.
    - [x] Run `npm run build` in `packages/runner-python`.
    - [x] Record any intentionally deferred AppContext fields or behavior with rationale.
- [x] Task: Conductor - User Manual Verification 'AppContext Parity and Lifecycle Semantics' (Protocol in workflow.md)

### Implementation notes (Phase 2, 2026-06-21)

**Changes made:**

- `app_context.py`: Added `instance_id`, `initial_state`, `local_storage` (None/deferred)
  fields. Added `_kill_handlers`, `_monitoring_handlers`, `_ended`, `_destroyed`,
  `_destroy_error`, `_last_definition`, `_last_saved_state` internal state. Added
  methods: `add_stop_handler`, `add_kill_handler`, `add_monitoring_handler`,
  `end`, `destroy`, `emit_to_space`, `describe`, `save`. `set_health_check` now
  populates `_monitoring_handlers` for heartbeat composition parity.
  `keep_alive` accepts `milliseconds` keyword (takes precedence over positional
  `timeout`).

- `heartbeat.py`: `_resolve_health` now composes `_monitoring_handlers` in
  registration order. Bool results become `{"healthy": <bool>}`, dict results
  are shallow-merged. Empty handlers → `{"healthy": True}` default.

- `control_loop.py`: KILL control code now calls all registered `_kill_handlers`
  (sync/async via `maybe_await`) before raising `HardKillSignal`.

- `__main__.py`: `_build_sequence_context` accepts `instance_id` parameter and
  sets it on AppContext. `add_stop_handler` is overridden with the same wrapping
  as `set_stop_handler`. `_build_control_context` shares `_kill_handlers` and
  `_monitoring_handlers` from the shared context. `main()` passes
  `instance_id=boot_config.instanceId`.

- `test_app_context.py`: 24 new tests covering add_stop_handler,
  add_kill_handler, add_monitoring_handler, set_health_check adaptation, end,
  destroy, emit_to_space, describe, save, initial_state, local_storage,
  instance_id, keep_alive milliseconds keyword, and public API surface check.
  Additional integration coverage verifies `_build_sequence_context` wires
  `instance_id`, preserves existing host event payload shape for `emit()`, and
  emits `scope: "space"` for `emit_to_space()`.

- `test_heartbeat.py`: 8 new tests covering monitoring handler payload
  composition, async handlers, bool wrapping, multi-handler merge, fallback
  default, and set_health_check regression.

- `test_control_codes.py`: 3 new tests covering kill handler dispatch (async
  and sync) and no-handler fallback.

**Deferred considerations:**
- `local_storage` is present as `None` and documented as deferred — the Python
  runtime protocol does not support BPMux or localStorage.
- `end()` and `destroy()` set internal state markers only; wiring to
  `RuntimeTerminator` is deferred since the existing lifecycle path (STOP/KILL
  control codes → `perform_shutdown` → `SEQUENCE_STOPPED`) is sufficient for
  current use. Sequence code can call them safely but they do not terminate.
- `emit_to_space` maps to the same local event emitter as `emit` — no space
  protocol distinction exists in the current Python runtime.
- Logger forwarding parity: existing `JsonLogHandler` and `_configure_logging`
  unchanged; level forwarding is covered by existing handshake/SET tests.
- No shared TS package changes were needed; all changes are Python
  runtime-wrapper-local.
- Methods were aligned with Node AppContext chainability by returning the
  context object where safe. The initial `emit()` implementation added
  `scope: "host"`, which caused golden replay drift; this session-introduced
  protocol change was fixed so existing `emit()` frames remain byte-compatible.

**Validation:**
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm test -- tests/test_app_context.py tests/test_heartbeat.py tests/test_control_codes.py tests/test_lifecycle.py` in `packages/runner-python`: 70 passed before chainability/event-scope corrections.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm test -- tests/test_app_context.py tests/test_heartbeat.py tests/test_control_codes.py tests/test_lifecycle.py tests/parity/test_golden_replay.py` in `packages/runner-python`: 86 passed after correcting event payload compatibility.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm test` in `packages/runner-python`: 238 passed.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm run build` in `packages/runner-python`: passed.

**Phase checkpoint commit:** `599ede41` (`feat(runner-python): add AppContext parity APIs`).

## Phase 3: Input/Output Format Parity and Metadata

- [x] Task: Implement input parsing parity
    - [x] Support text input streams without breaking existing protocol framing.
    - [x] Support binary input streams without lossy encoding conversions.
    - [x] Support JSON-compatible input where the current runner protocol provides JSON content.
    - [x] Add `application/x-ndjson` parsing with item-by-item semantics and malformed-line error behavior documented by tests.
    - [x] Preserve backpressure and streaming behavior; avoid mandatory full buffering for large inputs.
- [x] Task: Implement output/result normalization parity
    - [x] Normalize `None`, `str`, `bytes`, JSON-serializable values, sync iterables, async iterables, async generators, and awaitables to runner output frames.
    - [x] Preserve binary payloads and text encoding boundaries.
    - [x] Emit NDJSON output consistently for `application/x-ndjson` where metadata or content type requests it.
    - [x] Preserve completion, error, stderr, and terminal monitoring semantics for each output shape.
    - [ ] ~~Introduce a runtime-owned output wrapper such as `runner_python.Output`~~ (Deferred: not clearly needed; existing `as_output_stream`/`forward_output_stream` provide sufficient coverage.)
- [x] Task: Implement canonical metadata handling
    - [x] Parse snake_case `requires` and `provides` metadata for topic and `content_type` values.
    - [x] Map canonical metadata to existing Hub/CLI-visible topic behavior.
    - [x] Add tests for topic rename/content-type behavior using the new metadata convention.
    - [x] Document legacy metadata behavior as non-primary and defer compatibility handling to Phase 5.
- [x] Task: Validate format and metadata parity
    - [x] Run focused runner-python format and metadata tests.
    - [x] Run full `npm test` in `packages/runner-python`.
    - [x] Run `npm run build` in `packages/runner-python`.
    - [x] Run `npm run check:runtime-invariants` if runtime protocol wording or invariant coverage changes.
- [x] Task: Conductor - User Manual Verification 'Input/Output Format Parity and Metadata' (Protocol in workflow.md)

### Implementation notes (Phase 3, 2026-06-21)

**Changes made:**

- `input_stream.py`: Added `_iter_json()` (full-buffer JSON parse, single yield) and
  `_iter_ndjson_lines()` (streaming line-by-line JSON parse with blank-line skip
  and malformed-line `ValueError`). Updated `make_input_stream` return type and
  `content_type` dispatch to support `application/json`, `application/x-ndjson`,
  and `text/x-ndjson`/`*x-ndjson` aliases.
  Documented that JSON is whole-value buffered by nature (intentional).

- `utils.py`: Restructured `_iter_headered_input` to keep text/plain and
  octet-stream backward-compatible (preserving `readline()` trailing `\n` for
  `Stream`-based sequences) while delegating `application/json` and
  `*x-ndjson` to `make_input_stream` for unified parsing. Unknown content types
  still raise `ValueError`.

- `__main__.py`: Fixed `_run_sequence_output` NDJSON path to use
  `json.dumps(..., separators=(",", ":"), ensure_ascii=False)` — matching
  `forward_output_stream`'s compact JSON-line encoding for byte-for-byte
  parity with Node `JSON.stringify`.

- `README.md`: Updated input expectations table to document `application/json`
  and `application/x-ndjson`/`text/x-ndjson` support, the runtime header framing
  requirement, and the current output content-type support boundary.

- `tests/test_input_stream.py`: Added tests covering JSON dict/list/primitive
  parsing, empty JSON, NDJSON line-by-line, blank-skip, backpressure,
  malformed-line `ValueError`, malformed JSON, trailing data, empty input,
  primitives, whitespace-only lines, no-header framing behavior, and
  `text/x-ndjson` alias handling.

- `tests/test_output_stream.py`: Added `text/x-ndjson` alias coverage; existing
  tests cover compact NDJSON output via `forward_output_stream`, and the
  `_run_sequence_output` fix brings the runtime path into parity.

- `tests/test_utils.py`: Added `as_output_stream` normalization tests (None,
  bytes, dict, list, async iterable, async generator), `_iter_headered_input`
  delegation tests (text/plain, json, ndjson, octet-stream, default
  content-type), and `text/x-ndjson` output/input alias coverage.

- `tests/parity/fixtures/ndjson-output/recorded.json`: Updated OUT channel
  bytes_b64 from spaced JSON (default `json.dumps`) to compact JSON
  (`separators=(",", ":")`) to match the new runtime NDJSON output encoding.

**Deferred considerations:**

- `runner_python.Output` wrapper was not introduced — the existing
  `as_output_stream`/`forward_output_stream`/`_run_sequence_output` pipeline
  provides sufficient coverage for all supported return shapes.

- `text/plain` backward compat in `_iter_headered_input`: the header path
  retains `readline()`-based line reading (including trailing `\n`) to avoid
  breaking existing `scramjet.streams.Stream` sequences that depend on the
  newline-terminated chunk behavior. The direct `make_input_stream` path strips
  newlines for clean line-by-line semantics.

- `application/json` output metadata remains advisory: runtime output framing
  currently has explicit behavior for binary and NDJSON outputs, while ordinary
  JSON-serializable values are serialized through the default output path. No
  `runner_python.Output` wrapper was introduced.

- No-header raw input remains unsupported in the runtime wrapper header path;
  host input framing is expected to include the HTTP-like blank-line terminator.

**Validation:**
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm test -- tests/test_input_stream.py tests/test_output_stream.py tests/test_utils.py tests/parity/test_golden_replay.py` in `packages/runner-python`: 82 passed.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm test` in `packages/runner-python`: 268 passed.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm run build` in `packages/runner-python`: passed.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm run check:runtime-invariants` from the repository root: 8 passed, 0 failed.

**Phase checkpoint commit:** `17b05ce2` (`feat(runner-python): align input output format parity`).

## Phase 4: New Python BDD Refapps and Final Runtime Validation

- [~] Task: Replace Python BDD refapps with new-contract examples
    - [ ] ~~Create or update Python BDD refapps for exception stderr, text input, binary input, NDJSON input/output, health override, logger forwarding, topics, async generator output, stop/keep_alive, kill handler, events, and ASGI API exposure.~~ (Deferred by user instruction: outdated refapp BDD coverage will be recreated in a later track.)
    - [ ] ~~Ensure new Python BDD refapps use `main(context, input_stream, *args)` and the new AppContext API.~~ (Deferred by user instruction: outdated refapp BDD coverage will be recreated in a later track.)
    - [ ] ~~Ensure new Python BDD refapps do not depend on `scramjet-framework-py`.~~ (Deferred by user instruction: outdated refapp BDD coverage will be recreated in a later track.)
    - [ ] ~~Keep BDD scenario intent stable while changing Python refapp internals.~~ (Deferred by user instruction: outdated refapp BDD coverage will be recreated in a later track.)
    - [x] Add a new fixture-format regression reproducing the Phase 4 Python verser2 TLS failure (`tls.ca` inline CA passed to a dependency that accepts only `tls_ca_file`).
    - [x] Fix runner-python verser2 TLS mapping so inline CA bundles are materialized as temporary PEM files and cleaned up on close/failure.
- [~] Task: Run staged validation gates
    - [x] Run full `npm test` in `packages/runner-python`.
    - [x] Run `npm run build` in `packages/runner-python`.
    - [x] Run `npm run build:packages` if package-level changes affect shared build output.
    - [x] Run `npm run check:runtime-invariants`.
    - [ ] ~~Run targeted BDD paths needed for the changed Python refapps.~~ (Deferred by user instruction: outdated refapp BDD coverage will be recreated in a later track.)
    - [ ] ~~Run `npm run test:bdd-ci-python` as the final Python runtime smoke gate.~~ (Deferred by user instruction: outdated refapp BDD coverage will be recreated in a later track.)
    - [x] Record any skipped broad Docker/Kubernetes validation and reason.
- [~] Task: Complete runtime parity review
    - [x] Review Python behavior against Node/Bun platform-visible semantics for logs, health, lifecycle, events, topics, input, output, and ASGI API exposure.
    - [x] Fix non-BDD lifecycle parity blockers found by review: STOP `keep_alive(milliseconds=...)`, sequence-facing stop-handler chainability, and SET log-level propagation to the sequence logger.
    - [x] Add focused non-BDD ASGI API exposure coverage for new-contract `main()` sequences.
    - [x] Expand AppContext/ASGI/lifecycle README docs so docs, tests, and runtime describe the same Python contract.
    - [ ] Confirm no new refapp depends on old `scramjet.streams.Stream`, old health/stop APIs, or legacy module-global assumptions.
    - [ ] Confirm docs, tests, and runtime behavior describe the same Python contract.
- [ ] Task: Conductor - User Manual Verification 'New Python BDD Refapps and Final Runtime Validation' (Protocol in workflow.md)

### Implementation notes (Phase 4 partial, 2026-06-21)

**Scope adjustment:**

- A targeted BDD run exposed a Python verser2 TLS failure before old Python
  sequence behavior could be validated. The root cause was in runner-python's
  verser2 adapter mapping, not in sequence contract code: boot config can carry
  inline `verser2Runtime.tls.ca`, while `verser2_guest_python` accepts only a
  CA file path (`tls_ca_file`). Passing `tls_ca` reproduced the dependency
  contract failure.
- Per user instruction, outdated Python BDD/refapp coverage is not being
  addressed in this checkpoint and will be recreated in a later track. The
  previously attempted ignored refapp archive changes were unstaged and are not
  part of this scoped fix.

**Changes made:**

- `verser2_runtime.py`: inline CA bundles are written to temporary PEM files and
  passed to Broker/Guest factories as `tls_ca_file`. Temporary files are cleaned
  up when the underlying Broker/Guest `close()` runs, and also on factory/connect
  failure.
- `tests/parity/fixtures/verser2-inline-ca/fixture.json`: added a new fixture
  describing the inline-CA boot-config shape and expected dependency-facing TLS
  kwargs.
- `tests/parity/test_verser2_runtime_fixtures.py`: added fixture-driven tests
  for Broker and Guest paths. The fake dependency rejects `tls_ca` to reproduce
  the observed issue and verifies cleanup of the generated CA file.
- `tests/test_verser2_runtime.py`: kept generic TLS mapping tests focused on
  file-based CA, PEM identity, PFX identity, and lifecycle binding; moved inline
  CA regression coverage to the new fixture format.

**Validation:**

- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm test -- tests/test_verser2_runtime.py tests/parity/test_verser2_runtime_fixtures.py` in `packages/runner-python`: 11 passed.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm test` in `packages/runner-python`: 268 passed.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm run build` in `packages/runner-python`: passed.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm run build:packages` from the repository root: passed.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm run check:runtime-invariants` from the repository root: 8 passed, 0 failed.
- Targeted Python BDD (`BDD_INCLUDE_LONG_RUNNING=1 ... -t "@ci-instance-python"`) after the TLS fix showed outdated refapp-suite failures in health/log/topic scenarios; those are deferred by user instruction and not treated as blockers for this scoped TLS fix.

**Review notes:**

- Oracle review approved the scoped TLS inline-CA fix. No blocking issues found.
  Non-blocking risks: direct callers that create a Broker/Guest and never close it
  can leak the temporary CA file; cleanup-on-factory/connect-failure tests could
  be added later if this path changes further. Existing runtime paths close the
  hub client and sequence guest.

**Manual verification:**

- Scoped TLS checkpoint commit `f25e9283` was pushed and manually approved by
  the user on 2026-06-21. Outdated refapp BDD coverage remains deferred to a
  later track by user instruction.

**Runtime parity review (non-BDD):**

- Oracle review found no need to run or refactor outdated refapp BDD coverage,
  but identified non-BDD runtime parity blockers to fix before moving to legacy
  compatibility: STOP keepalive should accept `milliseconds` in the real
  shutdown path, sequence-facing stop-handler registration should remain
  chainable after runtime wrapping, SET log-level control should update the
  sequence-facing logger, and ASGI API exposure needs focused new-contract
  runtime coverage. README AppContext/ASGI/lifecycle docs also need alignment
  with implemented and deferred behavior.

**Runtime parity fixes (non-BDD):**

- `lifecycle.py`: STOP shutdown keepalive tracking now accepts
  `context.keep_alive(milliseconds=...)`, forwards the keyword to the underlying
  AppContext method, and extends the shutdown deadline using the effective
  keyword/positional timeout.
- `__main__.py`: runtime-wrapped `add_stop_handler`/`set_stop_handler` now
  preserve AppContext chainability and the control context keeps a reference to
  the sequence-facing logger.
- `control_loop.py`: `SET` `logLevel` updates both the control logger and the
  sequence-facing logger.
- `tests/parity/fixtures/control-set`: updated the fixture to assert
  `debug-enabled` and remove the old legacy unawaited-SET stderr warning.
- `tests/test_app_context.py`, `tests/test_lifecycle.py`, and
  `tests/test_control_codes.py`: added focused regression coverage for
  chainability, STOP `milliseconds`, sequence logger propagation, and
  new-contract `main()` ASGI app attachment through `context.api`.
- `README.md`: documented AppContext fields, lifecycle/monitoring, events,
  ASGI exposure, and current local-only/deferred behavior.

**Validation (runtime parity fixes):**

- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm test -- tests/test_app_context.py tests/test_lifecycle.py tests/test_control_codes.py tests/parity/test_golden_replay.py` in `packages/runner-python`: 76 passed.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm test` in `packages/runner-python`: 272 passed.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm run build` in `packages/runner-python`: passed.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm run build:packages` from the repository root: passed.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm run check:runtime-invariants` from the repository root: 8 passed, 0 failed.

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

# Sequence Writing Guide Implementation Plan

## Implementation setup

- [x] Task: Capture the current branch as the PR base and create
  `conductor/sequence_writing_guide_20260716` from its current HEAD.
- [x] Task: Read the package codemaps and existing test surfaces named in
  `guide-map.md`; record exact test files, public route/client contracts, and
  shared exports before editing implementation code.
  - Inventory: `packages/sequence-test/test/harness/fixtures-helper.spec.ts`,
    `packages/sequence-test/test/fixtures/sequence-fixtures.spec.ts`, and
    `packages/sequence-test/test/harness/{captures,hub-harness}.spec.ts` cover
    the relevant synthetic patterns. `createSequenceFixture` and the capture
    APIs are existing exports; no file-backed cursor helper exists.
- [x] Task: Create or update the draft PR from the implementation branch using
  `spec.md` as its description after the first phase checkpoint.
  - Draft PR: https://github.com/0rail/transform-hub/pull/56

## Phase 1: Documentation that needs no platform changes

- [x] Task: Write synthetic tests first for packaged-resource resolution,
  fixture-local source-file summaries, file-backed mock cursor reads/writes, and classified cursor
  store failures using `@scramjet/sequence-test` fakes/captures only.
    - [x] Confirm the tests model progression rather than a full wet example.
    - [x] Define the file-backed mock boundary, including fixture-local path,
      cleanup, failure handling, and non-transactional cursor semantics.
  - Added `test/harness/file-backed-mock-cursor.spec.ts`. It specifies
    `createFileBackedMockCursor({ directory, fileName })` returning `filePath`,
    `read`, `write`, and explicit `cleanup`. The supported runner recorded two
    expected red failures for the absent export; the next named task implemented
    that helper and the focused test now passes.
- [x] Task: Implement only the fixture/harness additions needed for those tests,
  then run the focused sequence-test/package validation under the supported
  memory guard.
  - Added `src/file-backed-mock-cursor.ts` and its public exports. Focused
    validation passed: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024"
    SCRAMJET_AVA_MEMORY_GUARD=1 node ../../scripts/run-ava.js
    test/harness/file-backed-mock-cursor.spec.ts` from `packages/sequence-test`
    (7 tests). The effective strict parent growth threshold was 524288 bytes;
    no exceptions or skips apply.
- [x] Task: Write `sequence-configuration-resources-state.md` and
  `source-side-data-summary.md` from the Open Energy Platform case.
    - [x] Explain packaged versus configured external resources, adapter
      visibility boundaries, data-local summarization, and no runtime-managed
      checkpointing.
    - [x] Keep code inline; compile or extract-test contract-bearing snippets.
      `test/harness/source-side-data-summary.spec.ts` extracts and type-checks
      all three TypeScript blocks. It passed under `SCRAMJET_AVA_MEMORY_GUARD=1`
      with a documented 786432-byte per-test allowance for TypeScript compiler
      metadata; temporary files and compiler references are explicitly cleaned.
- [x] Task: Update `testing-sequences.md` and
  `tested-incremental-log-aggregator.md` from the DVC case.
    - [x] Explain synthetic progression and file-backed mock cursors; require
      file-fixture and snippet validation only, with no cursor-store integration
      or external-service smoke test.
    - [x] State that `this.save()` is not the persistence approach.
- [x] Task: Update navigation, examples indexes, and cross-links for the Phase 1
  pages; regenerate documentation and validate generated output.
  - `npm run docs:generate` regenerated `docs/` navigation and content; guarded
    `npm run docs:check` passed source, link, frontmatter, and output-parity
    validation.
- [x] Task: Perform Phase 1 deduplication and documentation-code validation;
  record memory-guard applicability, skipped surfaces, and validation results in
  the plan.
  - Deduplication: added one public fixture-only cursor helper and reused it in
    both guides; no shared runtime, adapter, or persistence API was introduced.
    Oracle review repaired fixture-path symlink safety and streamable guide
    output, then passed revalidation.
  - Memory-guarded validation: from `packages/sequence-test`,
    `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024"
    SCRAMJET_AVA_MEMORY_GUARD=1 node ../../scripts/run-ava.js
    test/harness/file-backed-mock-cursor.spec.ts
    test/harness/source-side-data-summary.spec.ts
    test/harness/documentation-cursor-snippets.spec.ts` passed 11 tests.
    Effective default parent-growth threshold: 524288 bytes. Each TypeScript
    extraction test has a documented 786432-byte per-test allowance for
    compiler metadata, with registered cleanup; no skips apply.
  - Documentation validation: guarded `npm run docs:generate` and `npm run
    docs:check` passed. Docker/Kubernetes, external-store, and full wet-example
    smoke tests are intentionally not applicable to this fixture/documentation
    scope. Deferred P2 input-validation wording is recorded in `td.md` for
    final reconciliation.
- [x] Task: Commit the completed Phase 1 work, push the implementation branch,
  and update or create the draft PR.
  - Phase checkpoint commit: `04abb238e5ece577bc968df23d6963e27259788a`.
- [ ] Task: Conductor - Phase Completion 'Documentation that needs no platform changes' (Protocol in workflow.md)

## Phase 2: Readiness and autostart contracts

- [ ] Task: Write failing synthetic tests first for resource validation, deferred
  listener registration, validation failure with no listener, readiness after
  success, file loading, and configuration-driven autostart.
    - [ ] Specify the readiness state machine and restart behavior before
      implementation.
- [ ] Task: Implement and test readiness across runtime wrappers, host routing,
  and sequence-test fixtures.
- [ ] Task: Implement file-loaded/autostarted sequence configuration and the
  smallest Compose-ready startup/readiness contract needed by the MCP guide.
- [ ] Task: Run targeted runtime, API/client, config, and Compose smoke tests;
  perform deduplication, record validation/memory evidence, commit, push, and
  update the draft PR.
- [ ] Task: Conductor - Phase Completion 'Readiness and autostart contracts' (Protocol in workflow.md)

## Phase 3: Health and control contracts

- [ ] Task: Write failing synthetic tests first for `healthy` plus namespaced
  `details`, reserved fields, namespace-key grammar, concrete size bound,
  deterministic merging, malformed handler output, stop/timeout, kill, errors,
  and terminal lifecycle state.
- [ ] Task: Implement and test detailed-health propagation through runtime
  monitoring frames, Hub, Manager, API/client contracts, and CLI output.
- [ ] Task: Implement and test direct-Hub and Manager-routed control conformance
  for the same health, stop, kill, error, and terminal-state operations.
- [ ] Task: Run focused runtime, API/client, CLI, and Manager integration tests;
  perform deduplication, record validation/memory evidence, commit, push, and
  update the draft PR.
- [ ] Task: Conductor - Phase Completion 'Health and control contracts' (Protocol in workflow.md)

## Phase 4: Hub and Space topic contracts

- [ ] Task: Write failing synthetic topic-contract tests first, then settle
  operation signatures, identifiers, naming/origin, duplicate names, content
  types, routing, backpressure, disconnect/reconnect errors, and no replay.
- [ ] Task: Implement and test Hub/Space topic operations across sequence,
  API/client, CLI, Hub, and Manager layers using the settled contract.
- [ ] Task: Run focused topic fixture, Hub/Space client/API/CLI, Manager-routing,
  and reconnect tests; perform deduplication, record validation/memory evidence,
  commit, push, and update the draft PR.
- [ ] Task: Conductor - Phase Completion 'Hub and Space topic contracts' (Protocol in workflow.md)

## Phase 5: AppContext runtime conformance

- [ ] Task: Write failing conformance tests first for health/details, lifecycle
  handlers, logs, events, Hub/Space clients, and exposed APIs in Node, Python,
  and Bun.
- [ ] Task: Implement runtime wrapper and shared-contract changes required for
  parity; record every intentional runtime difference explicitly.
- [ ] Task: Run actual multi-runtime integration coverage where sequence-test
  cannot execute a runtime; perform deduplication, record validation/memory
  evidence, commit, push, and update the draft PR.
- [ ] Task: Conductor - Phase Completion 'AppContext runtime conformance' (Protocol in workflow.md)

## Phase 6: Capability-dependent documentation and final alignment

- [ ] Task: Write or update synthetic progression tests first for lifecycle,
  control, API, communication, topics, and AppContext wet-guide behavior, plus
  extraction/compilation validation for inline TypeScript, Python, and Compose.
- [ ] Task: Write the lifecycle dry/wet pair from the Server Fault diagnostics
  case, documenting validation-before-listener, structured failures, and active
  long-running behavior.
- [ ] Task: Write the control dry/wet pair from the remote-site case,
  documenting detailed health and direct Hub versus Manager control flows.
- [ ] Task: Write the HTTP API dry guide and MCP wet guide from the Galaxy/Loom
  case, keeping the sequence API, Node MCP SDK bridge, and tunnel/private
  network ownership boundaries distinct.
- [ ] Task: Write the communication and topics dry/wet pairs, documenting
  streams, events, API calls, Hub/Space topics, connection loss, and no replay.
- [ ] Task: Write the AppContext/runtime-parity dry/wet pair and conformance
  matrix, marking every intentional runtime limitation.
- [ ] Task: Update collateral sequence, monitoring, packaging, API/client, CLI,
  Manager, Host, runner, runtime-wrapper, configuration, and sequence-test docs;
  regenerate references, sidebars, indexes, compatibility notes, and output.
- [ ] Task: Verify every capability-dependent claim has a passing focused test;
  perform final deduplication, record validation/memory evidence, commit, push,
  and update the draft PR.
- [ ] Task: Conductor - Phase Completion 'Capability-dependent documentation and final alignment' (Protocol in workflow.md)

## Track completion

- [ ] Task: Review all eight guide pairs, the guide map, generated output, and
  collateral documentation against the specification.
- [ ] Task: Reconcile deferred review findings against `td.md`, documenting
  accepted or rejected candidates with rationale.
- [ ] Task: Run the final narrowest sufficient validation suite and record exact
  memory-guarded commands, effective thresholds, skips/exceptions, and deferred
  follow-ups.
- [ ] Task: Push the final phase checkpoint, update the draft PR, and mark it
  ready for review only after final verification succeeds.
- [ ] Task: Conductor - Track Completion 'sequence_writing_guide_20260716' (Protocol in workflow.md)

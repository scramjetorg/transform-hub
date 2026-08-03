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
- [x] Task: Conductor - Phase Completion 'Documentation that needs no platform changes' (Protocol in workflow.md)

## Phase 2: Readiness and autostart contracts

- [x] Task: Write failing synthetic tests first for resource validation, deferred
  listener registration, validation failure with no listener, readiness after
  success, file loading, and configuration-driven autostart.
    - [x] Specify the readiness state machine and restart behavior before
      implementation.
      - ADR recorded: optional `initialize` hook, READY protocol boundary,
        deferred exposure registration, fresh-process restart through existing
        `required`/`restartLimit`, and a bounded startup timeout.
  - `test/readiness/readiness-progression.spec.ts` establishes the synthetic
    contract. Four red assertions are expected until the next named readiness
    implementation task supplies `validate`, `initialize`, route activation,
    and fresh restart semantics; the fixture-data assertion passes.
- [x] Task: Implement and test readiness across runtime wrappers, host routing,
  and sequence-test fixtures.
  - Implemented READY signaling, optional initialization, deferred exposure,
    host READY routing, and Node/Bun/Python readiness handling. Focused guarded
    sequence-test progression verification passes (5 tests); targeted runtime,
    host, and Python checks are recorded for the phase validation task.
- [x] Task: Implement file-loaded/autostarted sequence configuration and the
  smallest Compose-ready startup/readiness contract needed by the MCP guide.
  - Added startup manifest validation, relative-path resolution, stable-ID
    coverage, bounded readiness waiting, status readiness reporting, and
    polling guidance; focused config and host startup tests pass.
- [x] Task: Run targeted runtime, API/client, config, and Compose smoke tests;
  perform deduplication, record validation/memory evidence, commit, push, and
  update the draft PR.
  - Guarded focused checks passed: sequence-test readiness (5), host readiness
    and restart cleanup (27), runner-node readiness/handshake (18), Python suite
    (287), Compose contract/live-smoke definitions (2), typings split, runtime
    invariants, builds, docs validation, and changed-file Biome lint. Startup
    parsing remains centralized in `host/src/lib/startup-config.ts`.
  - Live Compose exercised the current image to Hub readiness and HTTP 200 route
    exposure, but the opt-in AVA execution exceeded this host's Docker/Node
    resource capacity; the reproducible command is deferred in `td.md` for a
    better-provisioned validation host. No Phase 2 implementation failure
    remains after Oracle re-review.
  - Phase checkpoint commit: `7c26e759`; draft PR verification comment updated.
- [x] Task: Conductor - Phase Completion 'Readiness and autostart contracts' (Protocol in workflow.md)

## Phase 3: Health and control contracts

- [x] Task: Write failing synthetic tests first for `healthy` plus namespaced
  `details`, reserved fields, namespace-key grammar, concrete size bound,
  deterministic merging, malformed handler output, stop/timeout, kill, errors,
  and terminal lifecycle state.
  - ADR fixed the 16384-byte details budget and namespace grammar. Added
    `test/contracts/health-control.contract.spec.ts`; its nine expected red
    assertions await the next named implementation task's facade and runtime
    propagation work.
- [x] Task: Implement and test detailed-health propagation through runtime
  monitoring frames, Hub, Manager, API/client contracts, and CLI output.
  - Implemented bounded namespaced details merging, Node/Python monitoring
    propagation, retained Host health, and v2 instance health output while
    preserving v1. The guarded synthetic contract suite passes all 9 tests.
- [x] Task: Implement and test direct-Hub and Manager-routed control conformance
  for the same health, stop, kill, error, and terminal-state operations.
  - Added focused Hub and Manager forwarding conformance for health/control
    semantics, classified errors, and timeout behavior; Manager API regression
    verification passes.
- [x] Task: Run focused runtime, API/client, CLI, and Manager integration tests;
  perform deduplication, record validation/memory evidence, commit, push, and
  update the draft PR.
  - Guarded validation passed: synthetic health/control contract (9), direct
    real-CSI Hub API conformance (11), Manager-routed real-CSI conformance (14),
    Python health tests, focused API/client checks, typings/runtime checks, builds,
    and changed-file lint. Shared TypeScript merge logic is centralized in
    `runtime-types`; Python mirrors its contract as cross-language parity code.
  - Phase checkpoint commit: `facae5c0`; draft PR verification comment updated.
- [x] Task: Conductor - Phase Completion 'Health and control contracts' (Protocol in workflow.md)

## Phase 4: Hub and Space topic contracts

- [x] Task: Write failing synthetic topic-contract tests first, then settle
  operation signatures, identifiers, naming/origin, duplicate names, content
  types, routing, backpressure, disconnect/reconnect errors, and no replay.
  - ADR defines the additive v2 Hub/Space topic contract. The contract test now
    has seven passing real-harness assertions for supported content types,
    Hub/Space operation sets, routing, backpressure, reconnect, and no replay.
- [x] Task: Implement and test Hub/Space topic operations across sequence,
  API/client, CLI, Hub, and Manager layers using the settled contract.
  - Implemented v2 descriptors/origins, Hub-only lifecycle operations, bounded
    live routing, canonical topic errors, typed clients, and Hub-default/Space
    CLI scope while preserving v1 behavior.
- [x] Task: Run focused topic fixture, Hub/Space client/API/CLI, Manager-routing,
  and reconnect tests; perform deduplication, record validation/memory evidence,
  commit, push, and update the draft PR.
  - Guarded focused suites passed for topic contracts (7), Host topic routing
    (68), Manager routing/service discovery (29), API-router error mapping (12),
    client and CLI scope coverage. Full package builds remain blocked by known
    pre-existing `packages/runner/src/runner.ts` TypeScript errors.
  - Phase checkpoint commit: `132f1034`; draft PR verification comment updated.
- [x] Task: Conductor - Phase Completion 'Hub and Space topic contracts' (Protocol in workflow.md)

## Phase 5: AppContext runtime conformance

- [x] Task: Write failing conformance tests first for health/details, lifecycle
  handlers, logs, events, Hub/Space clients, and exposed APIs in Node, Python,
  and Bun.
  - ADR freezes observable parity and intentional differences. Focused Python
    Hub/Space/API and Bun propagation tests are red for missing runtime support;
    Node baseline tests pass.
- [x] Task: Implement runtime wrapper and shared-contract changes required for
  parity; record every intentional runtime difference explicitly.
  - Python now provides scoped Hub/Space transport views, boot-config target
    propagation, effective lifecycle callbacks, and ASGI attachment. Hosted Bun
    forwards to Node; direct Bun rejects AppContext conformance. Local storage,
    save persistence, and a native Bun context remain intentional exclusions.
- [x] Task: Run actual multi-runtime integration coverage where sequence-test
  cannot execute a runtime; perform deduplication, record validation/memory
  evidence, commit, push, and update the draft PR.
  - Real hosted integration passed serial Docker BDD scenarios `APPCONTEXT-002
    TC-001` (Python) and `APPCONTEXT-002 TC-002` (Bun), each 13/13 steps with
    no leaked repository processes. They cover health, lifecycle, LOG/stdout,
    Hub/Space routing, exposed API, and scoped events. Direct Bun remains an
    explicit unsupported AppContext mode; hosted Bun delegates to Node.
  - Memory evidence: `SCRAMJET_BDD_MEMORY_GUARD=1 node scripts/run-bdd.js --
    --name="APPCONTEXT-002 TC-001"` and the corresponding TC-002 command use
    Docker's supported 1536m/2-CPU runner limit, a 524288-byte parent growth
    threshold, 104857600-byte child RSS/working-set thresholds, and documented
    per-scenario allowances. Focused Python (49), Bun (2), Node (4), and stream
    capture (4) tests passed; no skips or exceptions remain. Documentation
    matrix generation and `npm run docs:check` passed.
  - Phase checkpoint commit: `6cc76f77`; draft PR verification comment updated.
- [x] Task: Conductor - Phase Completion 'AppContext runtime conformance' (Protocol in workflow.md)

## Phase 6: Capability-dependent documentation and final alignment

- [x] Task: Write or update synthetic progression tests first for lifecycle,
  control, API, communication, topics, and AppContext wet-guide behavior, plus
  extraction/compilation validation for inline TypeScript, Python, and Compose.
  - Root `scripts/test/docs-generator.spec.js` now owns the guarded guide
    claim-evidence and inline-snippet validation tests; harness behavior remains
    in its readiness, contracts, and harness suites.
- [x] Task: Write the lifecycle dry/wet pair from the Server Fault diagnostics
  case, documenting validation-before-listener, structured failures, and active
  long-running behavior.
- [x] Task: Write the control dry/wet pair from the remote-site case,
  documenting detailed health and direct Hub versus Manager control flows.
- [x] Task: Write the HTTP API dry guide and MCP wet guide from the Galaxy/Loom
  case, keeping the sequence API, Node MCP SDK bridge, and tunnel/private
  network ownership boundaries distinct.
- [x] Task: Write the communication and topics dry/wet pairs, documenting
  streams, events, API calls, Hub/Space topics, connection loss, and no replay.
- [x] Task: Write the AppContext/runtime-parity dry/wet pair and conformance
  matrix, marking every intentional runtime limitation.
- [x] Task: Update collateral sequence, monitoring, packaging, API/client, CLI,
  Manager, Host, runner, runtime-wrapper, configuration, and sequence-test docs;
  regenerate references, sidebars, indexes, compatibility notes, and output.
- [x] Task: Verify every capability-dependent claim has a passing focused test;
  perform final deduplication, record validation/memory evidence, commit, push,
  and update the draft PR.
  - Guarded Phase 6 evidence tests pass (8), including strict type-checking for
    all wet-guide contract snippets. Runtime invariants (8), typings split,
    changed-file lint, generated documentation, and docs parity pass. Existing
    full-package build failure remains confined to known `packages/runner/src/
    runner.ts` TypeScript errors; no guide claim depends on that blocked surface.
    Compiler extraction allowances are 786432 bytes and 2097152 bytes with
    cleanup; no phase-specific skips apply.
  - Phase checkpoint commits: `cff418d7`, `fcb447d3`; draft PR verification
    comment updated.
- [x] Task: Conductor - Phase Completion 'Capability-dependent documentation and final alignment' (Protocol in workflow.md)

## Track completion

- [x] Task: Review all eight guide pairs, the guide map, generated output, and
  collateral documentation against the specification.
- [x] Task: Reconcile deferred review findings against `td.md`, documenting
  accepted or rejected candidates with rationale.
- [x] Task: Run the final narrowest sufficient validation suite and record exact
  memory-guarded commands, effective thresholds, skips/exceptions, and deferred
  follow-ups.
  - `SCRAMJET_AVA_MEMORY_GUARD=1` focused AVA command passed 25 guide/health/
    topic tests under `ulimit -v 1835008` and `NODE_OPTIONS="--max-old-space-size=1024"`.
    Effective parent threshold: 524288 bytes; Phase 6 compiler tests use
    documented 786432/2097152-byte allowances. `npm run docs:check`, runtime
    invariants (8), typings split (4), and changed-file Biome lint passed.
    Deferred live-Compose validation requires a better-provisioned CI host;
    owner recorded in `td.md`.
- [x] Task: Push the final phase checkpoint, update the draft PR, and mark it
  ready for review only after final verification succeeds.
  - Final checkpoint `1f3a5ffb` pushed. PR #56 is ready for review and carries
    final validation evidence as a comment.
- [x] Task: Conductor - Track Completion 'sequence_writing_guide_20260716' (Protocol in workflow.md)

## PR review remediation

- [x] Task: Reconcile the Bun author/runtime model and remove the public
  file-backed mock cursor feature with replacement sequence evidence.
  - [x] Define and implement the single supported Bun author/runtime path with
    Node-equivalent hosted AppContext behavior.
    - Bun now has one supported hosted path that delegates to Node-equivalent
      AppContext behavior; focused Bun tests pass (19).
  - [x] Remove the cursor implementation, exports, tests, guide references, and
    generated output; replace its evidence with sequence execution coverage.
    - Removed the cursor helper and replaced it with guarded fixture loading,
      execution, readiness, and health-route coverage (3 tests); docs generation
      and `npm run docs:check` pass.
    - Final review confirms remaining cursor references were removed and the
      specification and guide map are consistent.
- [x] Task: Add a canonical sequence project/run guide and rewrite source-side
  summarization as sequence-owned streaming work.
  - [x] Create one installed/projected sequence setup, local Hub, upload/start,
    and Hub/Manager execution guide.
    - Added `docs-source/sequences/setup-and-run.md`; focused guide coverage
      passes (2 tests).
  - [x] Rewrite the source-side summary walkthrough as a sequence-owned streaming
    directory iteration with actual sequence evidence.
    - The sequence now opens its configured directory once and yields validated
      summaries incrementally; guarded load/execution/readiness/health evidence
      passes (3 tests).
    - Failure-path evidence proves missing and non-directory configuration
      leaves no health/API route registered.
- [x] Task: Expand runnable Hub/Manager, API/RPC, topic routing, and dashboard
  examples across the guide pairs.
  - [x] Add API methods, RPC/cross-Hub discovery, upload/start, and topic routing
    examples using installed or packaged commands.
    - Added practical installed/package command, API/RPC, cross-Hub, deployment,
      and input/output topic-routing examples with focused generator evidence.
  - [x] Add the topic-probe dashboard consumer with local-port API/HTML output.
    - Added a topic-consuming local dashboard API and monochrome auto-refreshing
      HTML consumer with `dashboardPort` and local URL guidance.
- [x] Task: Apply global tone and terminology corrections, regenerate docs, and
  re-run focused review validation.
  - [x] Remove defensive/apologetic language and dry/wet terminology while
    preserving necessary operational disclosures.
    - Applied terminology, lifecycle ordering, and MCP/API-scope corrections
      across guide sources while retaining concrete operational disclosures.
  - [x] Regenerate documentation and run focused review validation.
    - Regenerated docs and passed `npm run docs:check`; guarded Phase 6
      contract validation passes (9 tests).
    - Final formal review passes; only the accepted out-of-scope live-Compose
      capacity follow-up remains in `td.md`.

## Manual verification remediation

- [x] Task: Reconcile all current PR review comments with an Oracle review,
  distinguishing addressed, unaddressed, and newly introduced findings.
  - Oracle identified five distinct actionable themes: lifecycle ordering, API
    guide MCP scope, deployable archive dependencies, source-summary conceptual
    consistency, and AppContext table syntax.
- [x] Task: For each distinct actionable comment, use Explorer to identify
  analogous repository surfaces, then use Fixer to apply the scoped remediation
  consistently and validate it.
  - [x] Lifecycle ordering.
    - Reordered the lifecycle guide and added a focused relative-heading-order
      assertion under the guarded Phase 6 contract test.
  - [x] Sequence HTTP API guide MCP scope.
    - Removed MCP material from the API guide, retained the standalone MCP
      walkthrough, and decoupled the guide map.
  - [x] Deployable package dependencies and isolated archive validation.
    - Documented install-before-pack and `.siignore` rules, with an isolated
      archive load test that proves no source-project dependency fallback.
  - [x] Sequence-owned source-summary consistency.
    - Aligned the conceptual guide with the sequence-owned streaming model and
      added a cross-page regression assertion against precomputed-input advice.
  - [x] AppContext conformance table syntax.
    - Corrected malformed source tables and added docs-source table-column
      validation with focused coverage.
  - [x] Canonical archive filename consistency.
    - Standardized deploy and send commands on the `si sequence pack` output
      filename, with focused regression coverage.
  - [x] Isolated archive fixture module compatibility.
    - Switched the isolated archive fixture to the CommonJS-compatible module
      version required by its `require()` execution proof.
- [x] Task: Re-run focused review validation, obtain final Oracle review, and
  checkpoint/push the remediation for manual review.
  - Live PR comment audit reports every actionable theme addressed. Guarded
    Phase 6 contracts (10), source-summary evidence (1), canonical guide
    coverage (3), docs generator tests (28), and docs generation/check pass.

## Example execution-path remediation

- [x] Task: Reassess every example for an actionable installed-deliverable
  execution path and deployment information; replace repository-only validation
  endings with example-facing start commands or canonical-guide links.
  - [x] Reassess the requirement and enumerate affected example endings.
    - Oracle found that none of the ten example pages satisfies the installed
      execution-path requirement; repository-only test endings remain across
      examples and related conceptual guides.
  - [x] Discover analogous repository-only validation endings and remediate each
    consistently with installed `sth` commands and deployment context.
    - [x] Add the installed Hub/deploy/observable-result path to lifecycle,
      health/control, AppContext, MCP, and local-object examples.
      - Added installed process-adapter Hub startup, readiness, deploy/start,
        observable-result, and optional-maintainer-evidence sections.
    - [x] Add the installed Hub/deploy/observable-result path to source summary,
      log aggregation, Python log processing, simple transform, and topic probe
      examples.
      - Added installed process-adapter Hub startup, readiness, deploy/start,
        observable-result, and optional-maintainer-evidence sections.
    - [x] Replace repository-only ending handoffs in the related sequence guides
      and establish a stable canonical setup-guide deployment anchor.
      - Added the canonical installed-process-adapter baseline anchor and
        replaced guide-ending repository validation handoffs with example links.
    - [x] Add regression coverage requiring executable installed-deliverable
      paths and prohibiting repository-only endings.
      - Focused guarded coverage now enforces the complete installed-adapter
        workflow and disallows terminal repository-only validation instructions
        across all ten examples.
    - [x] Make every embedded Hub startup workflow executable across terminals
      or with managed background lifecycle/cleanup.
      - Standardized foreground Hub startup as a two-line terminal block and
        moved readiness, deployment, and Manager operations into separate
        labelled terminal blocks.
    - [x] Correct the MCP status route exposure and bridge URL workflow.
      - Configured route mounting and switched the bridge to the supported
        instance-RPC status URL with an explicit deployed instance ID.
    - [x] Retrieve source-summary sequence output in its live success path.
      - Added the yielded-data `si instance output` command and distinguished it
        from structured logs and process stdout.
    - [x] Make producer and dashboard package build contexts explicit.
      - Documented each as an independently installed, built, production-pruned,
        and packed Sequence project.
  - [x] Regenerate docs, re-run focused validation, and obtain final review.
    - `npm run docs:generate`, `npm run docs:check`, and guarded Phase 6
      execution-path contracts (11) pass; final Oracle review passes all four
      formerly blocked execution-path findings and generated-doc parity.

## Phase 7: Author-facing standalone example style

- [x] Task: Rewrite each example as a standalone, second-person author guide
  using the approved style rule; do not address the deferred live-Compose P2.
  - [x] Rewrite `lifecycle-local-validation-service.md`.
  - [x] Rewrite `customer-site-health-control.md`.
  - [x] Rewrite `mcp-bridged-job-status.md`.
  - [x] Rewrite `local-object-filter-to-consumer.md`.
  - [x] Rewrite `customer-site-topic-probe-pipeline.md`.
  - [x] Rewrite `tested-incremental-log-aggregator.md`.
  - [x] Rewrite `app-context-health-parity.md`.
  - [x] Rewrite `source-side-data-summary.md`.
  - [x] Rewrite `python-log-processor.md`.
  - [x] Rewrite `simple-transform.md`.
- [x] Task: Regenerate documentation, validate guide contracts, and review the
  standalone author-guide style across all examples.
  - Root documentation-guide contracts pass (37) after generated output sync.
- [x] Task: Conductor - Phase Completion 'Author-facing standalone example style'
  (Protocol in workflow.md)
  - [x] Move every `What this demonstrates` section to the actual end of its
    example, after optional verification.
  - [x] Repair standalone workflow correctness for topic startup ordering,
    AppContext lifecycle behavior, MCP bridge build/run, and lifecycle route
    exposure.
  - [x] Restore the required motivating-public-case and primary-guide links for
    every wet guide without reintroducing maintainer-facing language.

## Phase 8: Manager and Hub Docker Compose startup guide

- [x] Task: Document how to start the existing Manager and STH/Hubs through
  Docker Compose, expose the Manager endpoint for installed `si`, and use the
  existing BDD Compose topology as verified evidence.
  - [x] Write the Compose startup guide using existing BDD Compose assets rather
    than implementing a new Compose stack.
    - User-directed WIP: document the manually verified Manager/Hub startup
      path without adding or changing Compose infrastructure.
    - Uses the approved external-CPM and single-source configuration model;
      Manager-level CLI routing remains deferred in `td.md`.
  - [x] Add focused documentation validation and link it from relevant Manager,
    Hub, and sequence execution pages.
    - Intentionally not run: user directed this WIP guide to remain manually
      verified only, without automated checks or generated-output publication.
  - [x] Regenerate documentation and validate the guide; preserve the deferred
    live-Compose P2 because this phase documents, rather than reimplements, the
    existing verified topology.
    - Intentionally not run: manual verification is the explicit acceptance
      boundary for this WIP guide; both deferred TD entries remain recorded.
- [x] Task: Conductor - Phase Completion 'Manager and Hub Docker Compose startup
  guide' (Protocol in workflow.md)

# Technical Debt: P2 Items

## P2-001: Assess/restrict CLI polling interval default change from 1000ms to 100ms

- **Severity**: P2
- **Phase**: Phase 10 (BDD Timing Rationalization)
- **Scope**: `bdd/step-definitions/`, `scripts/lib/bdd-chunk-timing.js`, chunk-mode runner lifecycle
- **Evidence**:
  - `timing.md:96-101` (item 4): unconditional direct-request sleep of 1000ms before HTTP request — candidate for 50-100ms polling.
  - `timing.md:109-114` (item 6): aggregation startup fallback with 1000ms delay when no readiness marker supplied.
  - `timing.md:214-215`: replacement matrix entry for "fixed direct-request/setup readiness delay" → "50 ms observable polling with 10 s bound".
  - `plan.md:332`: "Replace only unnecessary fixed sleeps with observable-condition polling at approximately 50-100 ms intervals."
  - `plan.md:354`: configurable 1000ms default ramp-up/ramp-down lifecycle steps in chunk-mode runner.
- **Current disposition**: **Deferred**
- **Rationale**: The readiness polling optimization is safe in principle (see `timing.md:93-114` classification), but the 1000ms chunk-mode ramp-up/ramp-down defaults (`plan.md:354`) are operational PR/release guidance and should not be changed until the chunk-mode scheduler is enabled and ownership isolation is proven stable. Changing the BDD step-definition readiness delays from 1000ms to 50-100ms polling would reduce wall-clock time but requires repeated isolation validation first; doing so prematurely risks flaky scenarios when the underlying service is genuinely slow. Defer to a follow-up track focused on BDD parallel scheduler enablement.

## P2-002: Harden BDD memory exception URI matching against suffix collisions

- **Severity**: P2
- **Phase**: Phase 5 (BDD Parent Scenario Memory Guard), Phase 6 (BDD Child Process and Docker Container Memory Checks)
- **Scope**: `scripts/lib/bdd-memory-hooks-lib.js:33-56` — `matchScenarioException()`
- **Evidence**:
  - `scripts/lib/bdd-memory-hooks-lib.js:35`: `const uriMatch = featureUri.endsWith(exc.featureUri) || featureUri === exc.featureUri;`
  - `bdd/support/memory-hooks.ts:57-58`: doc comment states "Each exception is keyed by the **exact** feature-URI + scenario-name pair" — the implementation uses `endsWith`, not exact match.
  - `bdd/support/memory-hooks.ts:434-437`: three candidate URI prefixes (`featureUri`, `bdd/${featureUri}`, `/work/bdd/${featureUri}`) are produced for line-resolution but not for exception matching — `matchScenarioException` receives only the raw pickle URI and relies on `endsWith`.
  - Test coverage: `scripts/test/bdd-memory-guard.spec.js:325-640` exercises `matchScenarioException` with known-good and known-bad URIs, but no test verifies rejection of a different feature file whose path ends with the same suffix (e.g., `custom/e2e/E2E-010.feature` matching an exception registered for `e2e/E2E-010.feature`).
- **Current disposition**: **Deferred**
- **Rationale**: No suffix collision has been observed in practice because the pickle URI always starts with `features/` and exception URIs are relative to `bdd/features/`. The `endsWith` check works correctly for the current feature file set. However, the mismatch between documented "exact" matching and the `endsWith` implementation is a correctness concern if a future feature file is added to a nested or differently-prefixed directory. Fixing this requires choosing a normalization strategy (strip known prefixes before comparison, use path-relative exact match, or anchor to `/bdd/` boundary). Defer to a follow-up maintenance track that can also add focused regression tests for the path-boundary case.

## P2-003: Persist reproducible E2E-010 repeated Docker OOM/timing evidence

- **Severity**: P2
- **Phase**: Phase 10 (BDD Chunk Classification)
- **Scope**: `features/e2e/E2E-010-cli.feature`, `features/e2e/E2E-010-samples.feature`, chunk-classification evidence, CI/environment documentation
- **Evidence**:
  - `plan.md:348`: "E2E-010-cli ended with Docker exit 137 and `OOMKilled=true` at approximately 1.49 GiB" during individual 300-second feature runs on 2026-07-13.
  - `plan.md:336-337`: E2E-010 TC-005 CLI `-` chain passed under `BDD_INCLUDE_LONG_RUNNING=1` guard, but E2E-010-cli feature as a whole OOMs at ~1.49 GiB.
  - `timing.md:47-48`: E2E-010 feature alone ran in 2m00.351s wall time; slowest scenario 28,806.2 ms (TC-004); slowest step 11,679.7 ms (`I set config for local Hub`).
  - `timing.md:85-91` (item 3): E2E-010 configuration setup at 11,679.7 ms — four sequential `si config set` subprocesses.
  - Phase 10 classification: E2E-010 features classified as "memory-remediation-required" (not timing-remediation-required), meaning the OOM is the harder blocker.
- **Current disposition**: **Deferred**
- **Rationale**: The Docker OOM at 1.49 GiB is reproducible with `bdd/features/e2e/E2E-010-cli.feature` under the 300-second feature timeout (`plan.md:348`). Root cause is not timing (it completes within 2 minutes) but cumulative memory growth in the Docker container — likely from repeated CLI subprocess invocations or retained Hub/Manager state across the feature's 16+ scenarios. Full remediation requires either chunk-splitting E2E-010-cli into smaller memory-bounded chunks, reducing per-scenario retained allocations in the CLI setup/teardown path, or raising the Docker memory limit with documented justification. Defer to a follow-up track dedicated to E2E-010 stabilization and chunk memory budgeting because the fix requires CLI/host integration work outside this track's scope.

## P2-004: Clear `resources.floodCorrelationId` in flood-teardown cleanup

- **Severity**: P2
- **Phase**: Phase 10 (BDD Timing Rationalization)
- **Scope**: `bdd/lib/flood-teardown.js`, `bdd/step-definitions/e2e/host-steps.ts`
- **Evidence**:
  - `bdd/step-definitions/e2e/host-steps.ts:828`: `this.resources.floodCorrelationId = correlationId;` — the UUID is written to `resources` alongside `floodStream`, `floodAbortController`, etc.
  - `bdd/lib/flood-teardown.js:17-22`: `teardownFloodSource()` clears `floodStream`, `floodSendPromise`, `floodResponseClosedPromise`, `floodHubRequestLifecycleWaiter`, `floodSourceClosedPromise`, and `floodAbortController` — but never clears `floodCorrelationId`.
  - `bdd/step-definitions/world.ts:50`: `floodCorrelationId?: string` — typed as optional string on the world, retained via `resources`.
- **Current disposition**: **Deferred**
- **Rationale**: `floodCorrelationId` holds a short UUID string (~36 bytes) that is scenario-scoped and negligible for parent-heap measurement. Adding `resources.floodCorrelationId = undefined` to `teardownFloodSource()` would be a one-line consistency fix, but the retained string is dwarfed by the flood-stream and abort-controller objects that are already cleared. The cleanup gap is a consistency issue, not a measurable memory leak. Defer to the next maintenance pass over `bdd/lib/flood-teardown.js` when other cleanup gaps are addressed.

## P2-005: Test E2E-015 production exception entry directly rather than by reconstructed object

- **Severity**: P2
- **Phase**: Phase 5 (BDD Parent Scenario Memory Guard)
- **Scope**: `scripts/test/bdd-memory-guard.spec.js`
- **Evidence**:
  - `scripts/test/bdd-memory-guard.spec.js:474-485`: test `"E2E-015 allowance matches only exact URI, line, and scenario"` constructs a hardcoded inline object `{ featureUri: "e2e/E2E-015-unified.feature", line: 4, allowanceBytes: 90112, reason: "approved plateau cleanup" }` with an abbreviated reason string and diverging `allowanceBytes` from the production value.
  - `bdd/support/memory-hooks.ts:190-199`: the production `SCENARIO_EXCEPTIONS` entry for E2E-015 uses `allowanceBytes: 90_112` and a multi-sentence documented reason derived from observed plateau samples.
  - `scripts/lib/bdd-memory-hooks-lib.js:8-9`: the library comment states these helpers exist so "memory-guard infrastructure tests can test the production helpers directly (no copied logic)" — but the E2E-015 test does not follow this pattern; it reconstructs the exception object instead of importing and verifying the production entry.
- **Current disposition**: **Deferred**
- **Rationale**: The reconstructed object happens to share the same numeric `allowanceBytes` value (90112) as the production entry, so the test correctly covers the `matchScenarioException` matching logic. However, it does not verify that the production entry's reason or allowance bytes are correct. The production entry's reason is significantly longer (multi-sentence plateau evidence) and could drift from the test without detection. Fixing this would require either exporting the individual E2E-015 exception from `memory-hooks.ts` or having the test import `SCENARIO_EXCEPTIONS` and index-verify the correct entry. Defer because the matching logic is correct and no drift has occurred; add to a follow-up test-hygiene track.

## P2-006: Rename finite-response test to accurately say matches-and-destroys and test without EOF

- **Severity**: P2
- **Phase**: Phase 10 (BDD Timing Rationalization)
- **Scope**: `scripts/test/bdd-utils.spec.js`
- **Evidence**:
  - `scripts/test/bdd-utils.spec.js:168`: test name is `"finite response assertion drains and destroys the streamed response"`.
  - `scripts/test/bdd-utils.spec.js:168-180`: test body creates a `PassThrough` stream, ends it with `"finite output"` (no trailing EOF/data), and asserts `waitUntilStreamEquals` returns the content and has destroyed the stream.
  - `bdd/support/memory-hooks.ts:187-188`: the production E2E-015 comment explicitly describes `"The finite assertion matches the expected output and destroys the response stream; it does not assert EOF/trailing-data exhaustion."`
  - The name omits the key behavioral fact: `waitUntilStreamEquals` **matches-and-destroys** (not merely "drains") and the test verifies the assertion works **without EOF** (the stream ends with the matched content, not an explicit end-of-stream/EOF marker).
- **Current disposition**: **Deferred**
- **Rationale**: The current name is technically accurate (draining is a form of matching-and-destroying) but omits two distinguishing characteristics: (1) the function destroys the stream after match, and (2) it succeeds without an EOF/trailing-data signal. A more precise name would say `"waitUntilStreamEquals matches finite content, destroys the stream, and succeeds without EOF"` or similar. Test renames in this file are safe one-line changes but should be done alongside other bdd-utils test hygiene improvements to avoid churn on a stable test file. Defer to a follow-up test-maintenance pass.

## P2-007: Correct the `line=0` exact-exception comment in `bdd/support/memory-hooks.ts`

- **Severity**: P2
- **Phase**: Phase 5 (BDD Parent Scenario Memory Guard)
- **Scope**: `bdd/support/memory-hooks.ts` — `ScenarioException.line` field JSDoc
- **Evidence**:
  - `bdd/support/memory-hooks.ts:68-69`: `/** Exact scenario line number in the feature file (ignored when scenarioName is "*"). */` — this comment is incomplete.
  - `scripts/lib/bdd-memory-hooks-lib.js:45-49`: the `matchScenarioException` matching logic tests `exc.line === 0 || (scenarioLine > 0 && scenarioLine === exc.line)`. When `exc.line === 0`, the line check is disarmed for per-scenario exceptions as well, not just for `scenarioName === "*"`.
  - `bdd/support/memory-hooks.ts:233-267`: the HUB feature-level exceptions use `line: 0` redundantly with `scenarioName: "*"` — the `"*"` short-circuit already bypasses the line check, making `line: 0` superfluous in those entries.
  - `scripts/lib/bdd-memory-hooks-lib.js:46-48`: doc comment within the function correctly explains that `"line=0"` is an "explicitly line-agnostic exception" — but the interface-level JSDoc at `memory-hooks.ts:68` does not reflect this.
- **Current disposition**: **Deferred**
- **Rationale**: The interface-level comment is not wrong, but it is incomplete: it says line is ignored only for `scenarioName === "*"`, when in fact `line=0` also disarms the line check for per-scenario (non-wildcard) exceptions, as the matching logic at `bdd-memory-hooks-lib.js:49` explicitly handles. The HUB `line: 0` + `scenarioName: "*"` pattern is technically redundant but harmless. Fixing the comment is a one-line documentation change that should be done alongside the broader URI matching hardening (P2-002) in a follow-up maintenance track, since the comment and matching-function doc should remain consistent.

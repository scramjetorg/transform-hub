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

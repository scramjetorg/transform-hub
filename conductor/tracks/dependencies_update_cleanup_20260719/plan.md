# Dependencies Update and Cleanup Plan

## Phase 1: Establish the Immutable Behavior Baseline

- [ ] Task: Capture the immutable implementation reference before any dependency, test-runner, or test-tool edit.
  - [ ] Record PR base branch, immutable `HEAD` SHA, worktree status, and timestamp in `evidence/phase-1-baseline.md`.
  - [ ] Record hashes for the root and workspace package manifests and `package-lock.json`.
  - [ ] Preserve raw command output under `evidence/phase-1/` and reference the immutable revision in every later comparison.
- [ ] Task: Record the current Node support baseline and evaluate Node 22 feasibility without changing policy.
  - [ ] Inventory CI Node matrices, `engines` declarations, runtime/container images, release guidance, and developer documentation.
  - [ ] Record current supported versions and the Node 22 feasibility decision criteria in the Phase 1 evidence.
  - [ ] Record an evidence-based feasible/blocked conclusion; make no Node policy change in this phase.
- [ ] Task: Record production and full-tree audit baselines with dependency paths.
  - [ ] Run and retain timestamped `npm audit --omit=dev --json` and `npm audit --json` output at the immutable revision.
  - [ ] Run `npm explain` for every direct finding and record advisory ID, full dependency path, installed/fixed versions, direct/transitive owner, and production/dev reachability.
  - [ ] Classify every finding as retained production, removable, excluded Kubernetes-only, deferred development/tooling, or transitive-only.
- [ ] Task: Run the immutable package-test, build, and runtime-validation baseline.
  - [ ] Run `npm run test:packages`, `npm run build:packages`, and `npm run check:runtime-invariants` with repository memory guidance.
  - [ ] Record commands, environment, Node version, exit status, full output location, and test totals in Phase 1 evidence.
  - [ ] Create `td.md` entries for every failure, classified as pre-existing, environment/tooling, or new; do not repair unrelated baseline failures.
- [ ] Task: Create the technical-debt and scope ledger.
  - [ ] Define the `td.md` record schema: ID, dependency/path, owner, scope, evidence, risk, disposition, rationale, validation status, follow-up owner, and revisit condition.
  - [ ] Record retained production owners, removal candidates, excluded Kubernetes dependency paths, BDD Dockerode 3→4 deferral, and risky development migration candidates.
  - [ ] Record the required adapter-plugin follow-up, including optional Kubernetes installation, as a deferred item.
- [ ] Task: Conductor - Phase Completion 'Establish the Immutable Behavior Baseline' (Protocol in workflow.md)

## Phase 2: Remove Dead Direct Dependencies and Decouple Kubernetes Wiring

- [ ] Task: Produce a verifiable non-test dependency-removal inventory.
  - [ ] For each candidate, record declaration location, owner, direct/transitive relationship, and intended removal outcome.
  - [ ] Search TypeScript/JavaScript/Python imports and requires, package scripts, configuration, generated sources, dynamic loading, and workspace manifests.
  - [ ] Retain any candidate with evidence of use and record its disposition in `td.md`.
- [ ] Task: Remove only proven-unused non-test direct dependencies and stale declarations.
  - [ ] Remove one owner group at a time and update only its manifest declarations.
  - [ ] Regenerate `package-lock.json` with npm and run a clean deterministic install.
  - [ ] Verify each removed declaration and resolved lockfile entry is absent; record any intentionally transitive residual.
- [ ] Task: Remove Kubernetes adapter wiring from STH while preserving process and Docker behavior.
  - [ ] Remove Kubernetes CLI/help/config augmentation, adapter selection, and configuration forwarding from the STH boundary.
  - [ ] Split or replace the STH adapter aggregate import/dependency path so normal STH resolution excludes `@scramjet/adapter-kubernetes`.
  - [ ] Preserve Kubernetes package source unchanged and do not upgrade, test for compatibility, or remediate its dependency tree.
  - [ ] Align affected configuration/help/documentation references with the retained process and Docker adapter surface.
- [ ] Task: Validate retained process and Docker adapter behavior after decoupling.
  - [ ] Build affected STH and adapter packages and exercise process and Docker selection/configuration independently.
  - [ ] Verify both source and built STH entrypoints where applicable, including existing options and observable startup behavior.
  - [ ] Compare results to Phase 1 and classify any delta as matching, known baseline, environment-only, or regression.
- [ ] Task: Reclassify audit and lockfile results without expanding into excluded Kubernetes remediation.
  - [ ] Retain clean-install, production-audit, and full-tree-audit outputs with dependency paths.
  - [ ] Distinguish findings removed through decoupling from retained findings and Kubernetes-only residuals.
  - [ ] Record excluded Kubernetes-only residuals in `td.md` and route only retained non-excluded production findings to Phase 4.
- [ ] Task: Conductor - Phase Completion 'Remove Dead Direct Dependencies and Decouple Kubernetes Wiring' (Protocol in workflow.md)

## Phase 3: Consolidate Retained S3 Storage on pico-s3

- [ ] Task: Define the retained Manager S3 contract before migration.
  - [ ] Record S3 enablement and disk fallback, existing configuration-field semantics, endpoint/port/TLS/region/credential mapping, and bucket/object-key layout.
  - [ ] Record index creation/loading, legacy-array conversion, quota, upload identification, retrieval, deletion, clear behavior, and v1/v2 route/status/stream behavior.
  - [ ] Record that MinIO client/config migration compatibility, migration tooling, and MinIO-targeted compatibility tests are excluded.
- [ ] Task: Implement pico-s3 for the retained Manager S3 contract and remove MinIO.
  - [ ] Add/use the supported pico-s3 Manager dependency and map the retained configuration to its client options without a MinIO compatibility adapter.
  - [ ] Replace index and object stat/read/write/delete operations with awaited, stream-safe pico-s3 operations and actionable failure handling.
  - [ ] Remove MinIO imports, types, client construction, storage code, and the direct Manager manifest dependency.
  - [ ] Regenerate `package-lock.json` after the dependency changes.
- [ ] Task: Add focused retained-S3 coverage without MinIO compatibility coverage.
  - [ ] Test mocked/local pico-s3 object keys and stream operations, index initialization, legacy-array conversion, upload identification/quota, and delete/clear consistency.
  - [ ] Test v1 and v2 storage proxy routing plus Manager S3 configuration selection and disk fallback.
  - [ ] Do not add MinIO server/client compatibility or migration tests.
- [ ] Task: Align configuration and documentation with the retained S3 implementation.
  - [ ] Update only S3 schemas, defaults, masking, and tests whose behavior changes; otherwise preserve and explicitly test their mapping.
  - [ ] Update Manager/configuration docs and codemaps to remove MinIO-client claims and describe retained pico-s3 behavior.
  - [ ] Verify Manager source and manifests contain no MinIO references and the lockfile has no resolved MinIO entry or MinIO-only direct chain.
  - [ ] Record focused build/test and `npm audit --omit=dev --json` evidence.
- [ ] Task: Conductor - Phase Completion 'Consolidate Retained S3 Storage on pico-s3' (Protocol in workflow.md)

## Phase 4: Remediate Retained Production Dependency Findings

- [ ] Task: Classify retained production findings before choosing fixes.
  - [ ] Parse the immutable Phase 1 production audit baseline and post-removal audit results.
  - [ ] Record each advisory ID, dependency path, production reachability, manifest owner, installed/fixed versions, and excluded-Kubernetes status in `td.md`.
  - [ ] Create a reviewed retained-production vulnerability inventory before changing versions.
- [ ] Task: Apply eligible same-major production fixes one owner group at a time.
  - [ ] For each group, record current/target versions, advisory-fixed minimum, same-major proof, Node compatibility, and affected workspaces.
  - [ ] Define and run owner-specific focused build and test commands, then update manifests and lockfile for that group only.
  - [ ] Retain validation output and compare results with the Phase 1 baseline before beginning the next group.
- [ ] Task: Record all non-routine migrations as explicit deferrals.
  - [ ] Create a `td.md` record for every major or source-changing finding with path, why same-major is insufficient, production impact, owner, required evidence/tests, and deferral rationale.
  - [ ] Keep BDD Dockerode 3→4 outside this phase and record its required compatibility evidence.
  - [ ] Require a final-track accepted/rejected/deferred disposition for each record.
- [ ] Task: Upgrade the root npm development dependency safely.
  - [ ] Select the newest npm release compatible with the Phase 1 Node/CI support evidence.
  - [ ] Keep npm exclusively in root `devDependencies`, regenerate `package-lock.json`, and verify a clean `npm ci`/workspace install.
  - [ ] Run the root scripts affected by workspace install and script orchestration; retain target-version and result evidence.
- [ ] Task: Meet the production-audit closure criterion.
  - [ ] Run and retain post-change `npm audit --omit=dev --json`.
  - [ ] Compare every result with the retained-production inventory and record zero findings or each residual's advisory/path, exposure, compensating rationale, and required track-end approval.
  - [ ] Do not use `npm audit fix --force` or a permanent override as a substitute for compatibility verification.
- [ ] Task: Conductor - Phase Completion 'Remediate Retained Production Dependency Findings' (Protocol in workflow.md)

## Phase 5: Verify Node 22 LTS Policy and Production Behavior

- [ ] Task: Make the Node 22 support decision from reproducible evidence.
  - [ ] Reconcile the Phase 1 inventory of CI, engines, runtime images, install guidance, and developer documentation.
  - [ ] Approve Node 22 only when clean-install, build, invariant, and retained adapter behavior evidence passes on Node 22; otherwise retain current policy and record the blocker in `td.md`.
  - [ ] If approved, update every inventoried CI, metadata, container/runtime, and documentation declaration atomically and verify no conflicting baseline remains.
- [ ] Task: Run the retained production runtime validation contract.
  - [ ] Record exact commands, Node version, prerequisites, image tags, expected lifecycle/control/output observations, and pass criteria.
  - [ ] Run clean install, production package build, and `npm run check:runtime-invariants`.
  - [ ] Run focused process-adapter startup/lifecycle/output/control verification through the supported runner path.
  - [ ] Run focused Docker-adapter startup/lifecycle/output/control verification through the supported runner/container path.
- [ ] Task: Compare retained production behavior with the immutable baseline.
  - [ ] Reference the exact Phase 1 baseline revision, environment, commands/scenarios, and known failures.
  - [ ] Classify every divergence as matching, known pre-existing failure, environment-only deviation, or regression.
  - [ ] Halt progression on unapproved production behavior regressions; do not repair unrelated baseline failures.
- [ ] Task: Record the immutable production behavior checkpoint before test dependency work.
  - [ ] Create a revision-identified, timestamped checkpoint in track evidence with Node decision, validation results, comparison, failures, skips, exceptions, and audit state.
  - [ ] Make that checkpoint an explicit precondition for any Phase 6 dependency modification.
  - [ ] Preserve the checkpoint content and revision reference for Phase 6 comparisons.
- [ ] Task: Conductor - Phase Completion 'Verify Node 22 LTS Policy and Production Behavior' (Protocol in workflow.md)

## Phase 6: Assess and Safely Update Test Dependencies

- [ ] Task: Perform a checkpoint-gated development dependency audit.
  - [ ] Verify and cite the Phase 5 production checkpoint before changing a test dependency.
  - [ ] Run and retain the full development-tree audit, direct-manifest inventory, resolved lockfile paths, command options, date, and residual paths.
  - [ ] Classify every candidate as direct/transitive and production/dev/test-only before removal or update.
- [ ] Task: Remove only proven-unused test-only declarations.
  - [ ] Search imports/requires, package scripts, workspace manifests, generated outputs, test configuration, fixtures, and type usage for every candidate.
  - [ ] Record negative-use evidence and affected workspaces; retain any declaration whose removal breaks compatibility.
  - [ ] For each removal, run affected package build/type checks and focused AVA tests, then verify manifest/lockfile results.
- [ ] Task: Apply only behavior-preserving compatible test dependency fixes.
  - [ ] Record old/new resolved versions, rationale, impacted workspaces, and focused validation for every update.
  - [ ] Run `npm run test:packages` under repository memory guidance and compare command results and failing tests with the Phase 1 baseline.
  - [ ] Block or revert any new failure; record unchanged baseline failures separately from new deltas.
- [ ] Task: Record risky test/tooling migrations for Phase 7 reconciliation.
  - [ ] Create one `td.md` record for BDD Dockerode 3→4 and every risky test-runner/tooling major migration.
  - [ ] Include current/resolved version, affected BDD/runner surface, evidence gathered, validations not run and why, compatibility risk, non-implementation decision, owner/trigger, and `deferred pending Phase 7 reconciliation` disposition.
  - [ ] Do not implement these deferred migrations in Phase 6.
- [ ] Task: Audit every test behavior change for regression concealment.
  - [ ] Record every changed test, fixture, assertion, skip, retry, timeout, and test-runner option.
  - [ ] Reject expectation changes that merely accommodate a new failure; permit only dependency-API compatibility changes with before/after behavior evidence.
  - [ ] Verify focused coverage and serial-suite comparison show no new production regression.
- [ ] Task: Conductor - Phase Completion 'Assess and Safely Update Test Dependencies' (Protocol in workflow.md)

## Phase 7: Reconcile Deferred Work and Close the Track

- [ ] Task: Reconcile the complete deferred-work ledger.
  - [ ] Create `td.md` if it is absent; require every record to include identity, source phase/task, scope, evidence, disposition, rationale, owner, follow-up condition, and validation/status reference.
  - [ ] Enumerate all source deferrals from Phases 1, 4, 5, and 6 using that schema.
  - [ ] Mark every item accepted, rejected, or deferred with rationale, owner, follow-up condition, validation/status reference, and link to supporting evidence.
  - [ ] Verify no stale, nice-to-have, or out-of-scope item is silently promoted into track work.
- [ ] Task: Publish the adapter-plugin follow-up note.
  - [ ] Select and declare the canonical contributor-visible documentation location.
  - [ ] State that adapters should be install-time plugins, Kubernetes is optional rather than build-time included, and process/Docker behavior remains retained.
  - [ ] Review the note against implemented STH adapter wiring and record the limitation and follow-up owner.
- [ ] Task: Run and record the final validation matrix.
  - [ ] Record command, changed-surface rationale, result, baseline comparison, and skip/failure classification for `npm ci`, `npm run build:packages`, `npm run test:packages`, `npm run check:runtime-invariants`, and `npm run lint`.
  - [ ] Select named Docker/BDD smoke commands from changed adapter/runtime behavior and record prerequisites, results, and skip reasons.
  - [ ] Record all memory-guard variables, effective thresholds, skips, and exceptions for applicable Node/test validation.
- [ ] Task: Close audit findings and approved exceptions.
  - [ ] Capture final `npm audit --omit=dev --json` and `npm audit --json` output.
  - [ ] For every residual, record package/advisory/path, production/dev classification, disposition, remediation or residual rationale, approval authority for production residuals, and follow-up owner/condition.
  - [ ] Verify all skipped validation and exceptions are documented in the final evidence.
- [ ] Task: Create phase checkpoints and draft-PR evidence.
  - [ ] Verify Phase 1–6 each have one scoped commit and its SHA recorded in the plan.
  - [ ] Create the scoped Phase 7 commit, update the plan with its SHA, and record branch push and draft PR URL/status or why inapplicable.
  - [ ] Keep this current review's plan-only change uncommitted until explicitly requested.
- [ ] Task: Apply the track-specific close checklist.
  - [ ] Confirm every Phase 7 task has evidence, every deferred item meets the disposition schema, and all validation/audit exceptions are documented and approved.
  - [ ] Confirm documentation matches implemented behavior, no change-caused failures remain, and the final evidence set is complete.
  - [ ] Request formal close review only after the preceding checks pass.
- [ ] Task: Conductor - Phase Completion 'Reconcile Deferred Work and Close the Track' (Protocol in workflow.md)

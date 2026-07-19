# Dependencies Update and Cleanup Plan

## Phase 1: Establish the Immutable Behavior Baseline

- [ ] Task: Capture the current branch as the PR base and create `conductor/dependencies_update_cleanup_20260719` from HEAD before implementation.
- [ ] Task: Record the supported Node.js versions from CI, package metadata, and release documentation; determine whether a Node 22 LTS minimum is feasible without changing behavior.
- [ ] Task: Record production and full-tree audit baselines with dependency paths using `npm audit --omit=dev --json`, `npm audit --json`, and `npm explain` for direct findings.
- [ ] Task: Run the full serial package suite and required build/runtime checks before changing any dependencies.
  - [ ] Record every baseline failure in `td.md` with command output, classification, and a statement that it is not repaired in this phase.
- [ ] Task: Define the retained production dependency owners, removal candidates, excluded Kubernetes dependency tree, and deferred BDD Dockerode migration in `td.md`.
- [ ] Task: Conductor - Phase Completion 'Establish the Immutable Behavior Baseline' (Protocol in workflow.md)

## Phase 2: Remove Dead Direct Dependencies and Decouple Kubernetes Wiring

- [ ] Task: Re-confirm candidate declarations have no runtime, generated, configuration, or script usage before editing manifests.
- [ ] Task: Remove only proven-unused non-test direct dependencies and stale type declarations, then regenerate the npm lockfile.
- [ ] Task: Remove STH Kubernetes-adapter selection and configuration wiring while retaining process and Docker adapter wiring and preserving Kubernetes package source.
  - [ ] Do not upgrade, test for compatibility, or otherwise remediate Kubernetes adapter dependencies in this track.
- [ ] Task: Verify ordinary STH install/build paths no longer require the Kubernetes adapter dependency tree.
- [ ] Task: Re-run production and full-tree audits; reclassify findings from the reduced lockfile rather than upgrading removed trees.
- [ ] Task: Conductor - Phase Completion 'Remove Dead Direct Dependencies and Decouple Kubernetes Wiring' (Protocol in workflow.md)

## Phase 3: Consolidate Retained S3 Storage on pico-s3

- [ ] Task: Identify the Manager MinIO storage surface and the equivalent pico-s3 integration needed to retain the supported S3 behavior.
- [ ] Task: Migrate retained Manager S3 storage code to pico-s3 and remove MinIO-backed storage code and direct dependencies.
  - [ ] Do not add MinIO compatibility tests or retain MinIO migration support.
- [ ] Task: Update focused Host and Manager storage coverage for retained pico-s3 behavior only.
- [ ] Task: Re-audit and verify removed MinIO packages do not return as direct dependencies.
- [ ] Task: Conductor - Phase Completion 'Consolidate Retained S3 Storage on pico-s3' (Protocol in workflow.md)

## Phase 4: Remediate Retained Production Dependency Findings

- [ ] Task: Group retained production findings by owner (archive handling, Docker, YAML/configuration, UUID, S3, and npm tooling) and select the lowest compatible fixed release.
- [ ] Task: Apply same-major patch/minor upgrades independently, with focused package build and test validation for each owner group.
- [ ] Task: Escalate any source-changing or major upgrade to a separately documented migration task; do not mix it with routine upgrades.
- [ ] Task: Upgrade the direct root npm development dependency to the newest supported version while retaining it in `devDependencies`; validate workspace install and script execution.
- [ ] Task: Run `npm audit --omit=dev --json` and resolve or document every remaining production finding.
- [ ] Task: Conductor - Phase Completion 'Remediate Retained Production Dependency Findings' (Protocol in workflow.md)

## Phase 5: Verify Node 22 LTS Policy and Production Behavior

- [ ] Task: If Phase 1 evidence permits, update the supported Node.js baseline to 22 LTS in CI, package metadata, and developer documentation; otherwise record the blocking evidence in `td.md`.
- [ ] Task: Run production package builds, runtime invariants, and focused process/Docker behavior coverage against the retained runtime policy.
- [ ] Task: Compare behavior and validation results to the Phase 1 baseline; record known baseline failures without repairing unrelated failures.
- [ ] Task: Record the production behavior checkpoint and its validation commands before beginning test-dependency work.
- [ ] Task: Conductor - Phase Completion 'Verify Node 22 LTS Policy and Production Behavior' (Protocol in workflow.md)

## Phase 6: Assess and Safely Update Test Dependencies

- [ ] Task: Re-audit the development dependency tree only after the production behavior checkpoint is recorded.
- [ ] Task: Remove proven-unused test-only declarations such as direct transitive Cucumber protocol packages and stale test type declarations.
- [ ] Task: Apply only behavior-preserving, compatible test dependency fixes with the full serial package suite as the acceptance gate.
- [ ] Task: Keep BDD Dockerode 3-to-4 and all risky test-runner/tooling major migrations out of implementation; record their compatibility evidence and proposed follow-up work in `td.md`.
- [ ] Task: Do not change test expectations to conceal a production behavior regression.
- [ ] Task: Conductor - Phase Completion 'Assess and Safely Update Test Dependencies' (Protocol in workflow.md)

## Phase 7: Reconcile Deferred Work and Close the Track

- [ ] Task: Reconcile every tricky development dependency migration in `td.md` as accepted, rejected, or deferred, with rationale and a follow-up condition.
- [ ] Task: Add a follow-up note describing adapters as install-time plugins, including optional Kubernetes installation rather than build-time inclusion.
- [ ] Task: Run final clean-install, build, serial package test, runtime-invariant, lint, and scoped Docker/BDD validation appropriate to changed behavior.
- [ ] Task: Record final production and full-tree audit results, residual paths, skipped validation, and approved exceptions.
- [ ] Task: Commit each completed phase on the implementation branch and open or update the draft PR at required checkpoints.
- [ ] Task: Conductor - Phase Completion 'Reconcile Deferred Work and Close the Track' (Protocol in workflow.md)

# Implementation Plan: GitHub Actions Replacement

## Phase 1: Establish the CI contract and review surface

- [ ] Task: During `/conductor:implement`, capture the current branch as the PR base, create `conductor/github_actions_fix_20260730` from current HEAD, and perform all track work on it.
- [ ] Task: Create or update a draft implementation PR targeting the captured base branch, using the approved specification as its Markdown description.
- [ ] Task: Use @explorer for a read-only inventory of every `.github/workflows` file, its trigger, permissions, callers, secrets, artifacts, and current disposition; record the replacement/retention/removal matrix in track documentation.
- [ ] Task: Inspect `package.json`, release scripts, BDD runner options, Docker image scripts, and branch protection assumptions; map each required fast gate, AVA run, non-BDD suite, BDD suite, typecheck, and license check to an exact supported command.
    - [ ] Inventory existing Git hooks and secret/security tooling; select maintained, reproducible secret-scanning and workflow-policy tooling with CI and pre-commit integration.
    - [ ] Record whether a focused CI-validation or security tool is needed; if a new build/test/release tool or command is introduced, update `conductor/tech-stack.md` before using it.
    - [ ] Define the source SHA, `package-lock.json` hash, Node/npm version, platform, package-version, image-digest, and checksum metadata carried through checkpoint, prerelease, and release paths.
- [ ] Task: Define the target workflow topology, event/ref filters, stable check names, per-ref concurrency groups, cancellation rules, and least-privilege permission matrix.
    - [ ] Cover `pull_request` and applicable `merge_group` checks, `push` to `devel`, same-repository `devel` → `main` release-PR validation, protected `push` to `main`, and manually dispatched checkpoint bootstrap for `main`, `devel`, and `feat/manager-oss`.
    - [ ] Define GitHub auto-merge enablement for the managed `devel` → `main` PR without bypassing branch protection or required review.
    - [ ] Define immutable action-revision pinning, safe action-update ownership, checkout credential handling, log/artifact/cache secret-redaction rules, and a reviewed false-positive policy.
- [ ] Task: Add focused, reviewable validation for workflow syntax, policy invariants, trigger/permission/artifact contracts, and representative secret-detection behavior before or alongside the workflow implementation; record any remote-only checks that cannot be executed locally.
- [ ] Task: Ask @reviewer to review the phase inventory and CI contract for immediate next-step safety, scope coverage, and secret/trust-boundary correctness.
- [ ] Task: Conductor - Phase Completion 'Establish the CI contract and review surface' (Protocol in workflow.md)

## Phase 2: Implement trusted dependency checkpoint infrastructure

- [ ] Task: Implement shared workflow/composite-action helpers that install Node.js 22 and npm reproducibly, expose consistent workspace setup, and use supported current GitHub Actions revisions.
- [ ] Task: Implement the public-repository security baseline.
    - [ ] Configure reviewed immutable action revisions, least-privilege defaults, non-persistent checkout credentials, and safe logging/artifact/cache behavior in shared workflow helpers.
    - [ ] Add repository Git-hook integration for secret scanning, with documented installation, bypass policy, and a narrow reviewed allowlist mechanism where unavoidable.
    - [ ] Add CI secret scanning and workflow security-policy checks as protected required checks; ensure they inspect the intended diff/history and redact findings.
    - [ ] Add regression fixtures proving hooks and CI reject representative secret patterns without writing secrets to logs or artifacts.
- [ ] Task: Implement GHCR checkpoint creation and consumption for `main`, `devel`, and `feat/manager-oss`.
    - [ ] Build a dependency-ready image/cache layer that supports clean `npm ci`-style reinstalls without promoting `node_modules` as a portable build artifact.
    - [ ] Label and publish immutable images keyed by the defined source/dependency/runtime/platform identity; resolve consumers by digest and verify identity metadata before use.
    - [ ] Maintain branch checkpoint pointers only after confirming that the branch ref still matches the validated source SHA; make rebuilds and retries idempotent.
    - [ ] Restrict GHCR write access and checkpoint promotion to trusted same-repository branches; provide bootstrap dispatch inputs and safe no-checkpoint fallback behavior.
- [ ] Task: Add workflow-contract tests for image key construction, digest verification, permitted refs, pointer-race rejection, and untrusted-origin denial; run focused validation and a GHCR dry-run where credentials permit.
- [ ] Task: Update contributor/operations documentation with checkpoint identity, bootstrap, rebuild, recovery, registry permissions, and retention requirements.
- [ ] Task: Ask @reviewer to review the checkpoint implementation and test evidence, including digest use, trust boundaries, and retry behavior.
- [ ] Task: Conductor - Phase Completion 'Implement trusted dependency checkpoint infrastructure' (Protocol in workflow.md)

## Phase 3: Build the pull-request validation pipeline

- [ ] Task: Implement the Node 22/npm pull-request workflow using a fresh checkout and the applicable verified checkpoint, with read-only permissions for fork-originating code and no `pull_request_target` trigger.
- [ ] Task: Implement ordered fast checks before costly work.
    - [ ] Add the defined mergeability/merge-queue gate, secret/workflow-policy scan, lint, typecheck, dependency/release-alignment, runtime-invariant, and license commands with clear failure output.
    - [ ] Run AVA pre-build tests through the supported runner, build the required packages/images, and then execute the defined BDD path in an isolated job.
    - [ ] Carry only validated package/image artifacts between trusted jobs, checking published artifact digests/checksums before use.
- [ ] Task: Add automated workflow-policy tests covering Node 22-only/npm-only operation, fast-gate order, immutable action pins, fork permissions, credential non-persistence, `merge_group` coverage, artifact inputs, stale-run cancellation, and secret-scan enforcement.
- [ ] Task: Validate syntax and policy tests locally; exercise the workflow through a same-repository test PR or dispatch path and capture the resulting check names and outcome.
- [ ] Task: Ask @reviewer to review the PR workflow against the approved fast-check, AVA, build, BDD, public-repository security, trust, and concurrency requirements.
- [ ] Task: Conductor - Phase Completion 'Build the pull-request validation pipeline' (Protocol in workflow.md)

## Phase 4: Implement devel validation and release-PR automation

- [ ] Task: Implement the `devel` push workflow that starts from the last matching checkpoint in an ephemeral runner workspace, builds packages, and runs AVA and BDD in parallel isolated jobs.
- [ ] Task: Advance the `devel` checkpoint only after all required jobs succeed and its source identity is still current; make failed, superseded, or concurrent runs unable to update the branch pointer.
- [ ] Task: Implement managed `devel` → `main` PR creation/update and GitHub auto-merge enablement.
    - [ ] Ensure the workflow only operates on the intended same-repository branches and reports safely when branch protection, required reviews, or merge settings prevent auto-merge.
    - [ ] Add idempotency tests for existing PRs, retries, stale SHA protection, and auto-merge eligibility without granting a workflow merge-bypass capability.
- [ ] Task: Validate the `devel` flow through safe dispatch or controlled branch events, including parallel test fan-out and checkpoint update behavior.
- [ ] Task: Ask @reviewer to review devel checkpoint promotion and release-PR automation for immediate safety and branch-protection compatibility.
- [ ] Task: Conductor - Phase Completion 'Implement devel validation and release-PR automation' (Protocol in workflow.md)

## Phase 5: Implement main release-PR prerelease validation

- [ ] Task: Implement clean-checkout validation for a same-repository `devel` → `main` PR, including the full package build and exact non-BDD test suite from Phase 1.
- [ ] Task: Implement GitHub Packages prerelease publication using unique SemVer prerelease versions and explicit dist-tag/version policy, with `packages: write` available only to this trusted path.
- [ ] Task: Build the BDD test environment from the exact prerelease package manifest and matching validated runner/image artifacts; run BDD against those packages and reject version, checksum, or registry mismatches.
- [ ] Task: Add tests for PR/ref eligibility, version uniqueness, idempotent reruns, registry auth isolation, package manifest generation, and BDD package selection.
- [ ] Task: Validate with dry-run/fixture registry operations where possible and one controlled trusted release-PR run before enabling the production gate.
- [ ] Task: Ask @reviewer to review prerelease publishing and BDD-against-packages evidence, ensuring no credentials or untrusted artifacts cross the release boundary.
- [ ] Task: Conductor - Phase Completion 'Implement main release-PR prerelease validation' (Protocol in workflow.md)

## Phase 6: Implement protected main publication and migration cleanup

- [ ] Task: Document and configure the external npm trusted-publisher entries for every release-boundary package, the protected GitHub environment, required Node/npm versions, and production approval/protection rules.
- [ ] Task: Implement protected `main` publication using npm OIDC, the existing release-boundary/alignment rules, and non-cancellable production concurrency.
    - [ ] Publish only the verified release artifact/package set and record publication identity and rerun/idempotency behavior.
    - [ ] Advance the immutable `main` checkpoint only after successful trusted publication; do not rebuild or promote unverified bytes.
- [ ] Task: Replace or remove legacy workflow files according to the approved inventory, preserving only deliberate retained workflows and eliminating Node 18, Yarn, deprecated action versions, and duplicate triggers.
- [ ] Task: Run the complete workflow-contract and security suite, static workflow validation, secret-scanning hook/CI fixtures, mapped fast commands, targeted AVA/package proof, release-alignment check, runtime invariants, and applicable BDD smoke paths; record the exact memory-guard commands, thresholds, skips, and remote-only validation evidence.
- [ ] Task: Update CI/release documentation with triggers, checks, checkpoints, artifact contracts, registry/setup requirements, publication recovery, and ownership; perform a final workflow-file/trigger audit and deduplication check.
- [ ] Task: Ask @reviewer for a final production-profile review of the replacement suite, deletion inventory, trusted publishing path, and acceptance criteria.
- [ ] Task: Conductor - Phase Completion 'Implement protected main publication and migration cleanup' (Protocol in workflow.md)

## Phase 7: Finalize the implementation review surface

- [ ] Task: Confirm each phase has its scoped checkpoint commit recorded in this plan and pushed from `conductor/github_actions_fix_20260730` before final PR verification.
- [ ] Task: Update the draft implementation PR with final verification results as a PR comment; keep it draft until final verification is complete, then mark it ready for review.
- [ ] Task: Conductor - Phase Completion 'Finalize the implementation review surface' (Protocol in workflow.md)

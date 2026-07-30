# Implementation Plan: GitHub Actions Replacement

## Phase 1: Establish the CI contract and review surface

- [x] Task: During `/conductor:implement`, capture the current branch as the PR base, create `conductor/github_actions_fix_20260730` from current HEAD, and perform all track work on it. _(Completed: based on local `feat/manager-oss` at its then-current HEAD; branch pushed.)_
- [x] Task: Create or update a draft implementation PR targeting the captured base branch, using the approved specification as its Markdown description. _(Draft PR: https://github.com/scramjetorg/transform-hub/pull/1078.)_
- [x] Task: Use @explorer for a read-only inventory of every `.github/workflows` file, its trigger, permissions, callers, secrets, artifacts, and current disposition; record the replacement/retention/removal matrix in track documentation. _(Recorded in `workflow-inventory.md`; inventory confirms 15 legacy workflows, with 12 replacements and 3 removals.)_
- [x] Task: Inspect `package.json`, release scripts, BDD runner options, Docker image scripts, and branch protection assumptions; map each required fast gate, AVA run, non-BDD suite, BDD suite, typecheck, and license check to an exact supported command. _(Recorded in `ci-contract.md`; existing commands cover lint, alignment/license, runtime invariants, AVA, build, and BDD. Typecheck, secret scanning, and GitHub Packages prerelease paths require additions.)_
    - [x] Inventory existing Git hooks and secret/security tooling; select maintained, reproducible secret-scanning and workflow-policy tooling with CI and pre-commit integration. _(Selected Gitleaks, Actionlint, Zizmor, and a deterministic policy checker with repository-managed hooks; `pull_request_target` was rejected. Recorded in `ci-contract.md`.)_
    - [x] Record whether a focused CI-validation or security tool is needed; if a new build/test/release tool or command is introduced, update `conductor/tech-stack.md` before using it. _(A dedicated workflow-contract/security surface is required; Gitleaks, Actionlint, Zizmor, and the policy checker were recorded in `conductor/tech-stack.md` before implementation.)_
    - [x] Define the source SHA, `package-lock.json` hash, Node/npm version, platform, package-version, image-digest, and checksum metadata carried through checkpoint, prerelease, and release paths. _(Defined the canonical identity/statement contract, digest-only consumption, immutable-pointer rules, and rerun behavior in `ci-contract.md`.)_
- [x] Task: Define the target workflow topology, event/ref filters, stable check names, per-ref concurrency groups, cancellation rules, and least-privilege permission matrix. _(Defined in `ci-contract.md`, including protected workflow topology, stable checks, serialized checkpoint promotion, and least-privilege job permissions.)_
    - [x] Cover `pull_request` and applicable `merge_group` checks, `push` to `devel`, same-repository `devel` → `main` release-PR validation, protected `push` to `main`, and manually dispatched checkpoint bootstrap for `main`, `devel`, and `feat/manager-oss`. _(Defined event/ref eligibility and bootstrap restrictions in `ci-contract.md`.)_
    - [x] Define GitHub auto-merge enablement for the managed `devel` → `main` PR without bypassing branch protection or required review. _(Recorded constrained release-PR creation and protection-governed auto-merge behavior in `ci-contract.md`.)_
    - [x] Define immutable action-revision pinning, safe action-update ownership, checkout credential handling, log/artifact/cache secret-redaction rules, and a reviewed false-positive policy. _(Recorded immutable pin ownership, non-persistent checkout, sanitized output, cache/artifact controls, exception review, and permission matrix in `ci-contract.md`.)_
- [x] Task: Add focused, reviewable validation for workflow syntax, policy invariants, trigger/permission/artifact contracts, and representative secret-detection behavior before or alongside the workflow implementation; record any remote-only checks that cannot be executed locally. _(Added `check:workflow-policy` with 22 AVA fixtures, including reviewer-driven bypass regressions; `npm run test:workflow-policy`, `npm run check:workflow-policy`, and `git diff --check` passed. Actionlint, Zizmor, Gitleaks, rulesets, and remote credentials remain explicitly remote-only.)_
- [x] Task: Ask @reviewer to review the phase inventory and CI contract for immediate next-step safety, scope coverage, and secret/trust-boundary correctness. _(Reviewer PASS/accepted after two in-scope policy-checker remediations; 22 focused tests pass.)_
- [x] Task: Conductor - Phase Completion 'Establish the CI contract and review surface' (Protocol in workflow.md). _(Phase review PASS/accepted; local workflow-policy proof: 22 AVA tests and explicit compliant-fixture policy check.)_

## Phase 2: Implement trusted dependency checkpoint infrastructure

- [x] Task: Implement shared workflow/composite-action helpers that install Node.js 22 and npm reproducibly, expose consistent workspace setup, and use supported current GitHub Actions revisions. _(Added `.github/actions/setup-workspace` with immutable checkout/setup-node pins, Node 22 verification, trusted-only npm cache opt-in, and clean `npm ci`; 10 focused AVA tests pass.)_
- [x] Task: Implement the public-repository security baseline. _(Implemented pinned/redacted local and repository CI controls with focused regression coverage; external organization required workflow/ruleset remains a documented remote prerequisite.)_
    - [x] Configure reviewed immutable action revisions, least-privilege defaults, non-persistent checkout credentials, and safe logging/artifact/cache behavior in shared workflow helpers. _(The shared setup action uses reviewed immutable checkout/setup-node pins, explicit ref checkout without persisted credentials, default-off npm cache, and no node_modules/cache artifact handoff; its 10 AVA checks pass.)_
    - [x] Add repository Git-hook integration for secret scanning, with documented installation, bypass policy, and a narrow reviewed allowlist mechanism where unavoidable. _(Added checked-in `.githooks/pre-push`, fail-closed outgoing-ref scanning, verified Gitleaks v8.21.2 artifact hashes, reviewed empty allowlist, install/bootstrap commands, and `SECURITY.md`; 7 focused tests pass.)_
    - [x] Add CI secret scanning and workflow security-policy checks as protected required checks; ensure they inspect the intended diff/history and redact findings. _(Replaced legacy security CI with the Node 22/npm `Security / repository policy` check for PR, merge-queue, protected-branch, and scheduled redacted history paths; 12 focused tests and local policy check pass. Organization required-workflow/ruleset enforcement and pinned Actionlint/Zizmor remain remote prerequisites.)_
    - [x] Add regression fixtures proving hooks and CI reject representative secret patterns without writing secrets to logs or artifacts. _(Focused hook/history-scanner tests use synthetic findings to prove failure and redaction without placing credentials in fixture output; included in the 12-test `npm run test:security-ci` proof.)_
- [x] Task: Implement GHCR checkpoint creation and consumption for `main`, `devel`, and `feat/manager-oss`. _(Implemented verified dry-run checkpoint provenance/planning and trusted bootstrap controls; live GHCR publication remains a documented credential-gated remote operation.)_
    - [x] Build a dependency-ready image/cache layer that supports clean `npm ci`-style reinstalls without promoting `node_modules` as a portable build artifact. _(The checkpoint dry-run plan admits only `/opt/transform-hub/npm-cache`, explicitly excludes `node_modules`, `.npmrc`, and credentials, then requires fresh `npm ci --ignore-scripts`; provenance tests and dry run passed.)_
    - [x] Label and publish immutable images keyed by the defined source/dependency/runtime/platform identity; resolve consumers by digest and verify identity metadata before use. _(Dry-run-only checkpoint planning emits immutable `cp-v1-<identity-digest>` tags and provenance labels; consumers accept only matching statement image digests. Real GHCR publication remains gated on the documented remote publisher credential.)_
    - [x] Maintain branch checkpoint pointers only after confirming that the branch ref still matches the validated source SHA; make rebuilds and retries idempotent. _(The checkpoint plan rejects stale current-SHA/promotion combinations and tests pointer-race rejection; immutable identities are reused only after verification.)_
    - [x] Restrict GHCR write access and checkpoint promotion to trusted same-repository branches; provide bootstrap dispatch inputs and safe no-checkpoint fallback behavior. _(Bootstrap accepts only `main`, `devel`, or `feat/manager-oss`, has read-only permissions, performs no publication, and tests untrusted-source rejection. Missing/mismatched checkpoints cleanly fall back to fresh install.)_
- [x] Task: Add workflow-contract tests for image key construction, digest verification, permitted refs, pointer-race rejection, and untrusted-origin denial; run focused validation and a GHCR dry-run where credentials permit. _(Seven focused provenance/workflow tests passed, as did a local `devel` plan dry run and bootstrap workflow policy check. Live GHCR dry run is deferred pending the scoped remote publisher credential.)_
- [x] Task: Update contributor/operations documentation with checkpoint identity, bootstrap, rebuild, recovery, registry permissions, and retention requirements. _(Added `CHECKPOINTS.md` documenting dry-run bootstrap, canonical identity/digest consumption, cache-only content, stale-pointer recovery, scoped GHCR permissions, and immutable-digest retention.)_
- [x] Task: Ask @reviewer to review the checkpoint implementation and test evidence, including digest use, trust boundaries, and retry behavior. _(Reviewer PASS/deferred: Phase 3 can proceed; remote GHCR publication, ruleset, and OIDC controls remain explicitly documented prerequisites.)_
- [x] Task: Conductor - Phase Completion 'Implement trusted dependency checkpoint infrastructure' (Protocol in workflow.md). _(Reviewer PASS/deferred; checkpoint, security, and setup validation passed locally; protected GHCR/ruleset/OIDC prerequisites are documented for remote validation.)_

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

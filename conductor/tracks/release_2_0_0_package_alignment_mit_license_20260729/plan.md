# Implementation Plan: Release 2.0.0

## Phase 1: Establish Release Scope and Review Surface

- [x] Task: Establish the dedicated implementation branch and release review surface.
    - [x] Capture the current branch as the pull-request base and apply branching-policy checks for a dirty worktree, non-main base, upstream availability, unpushed commits, and divergence. Base: `feat/manager-oss` at `db54d058fb4d71dca958272ca67fccff793a9970`; clean, tracked, and synchronized with `origin/feat/manager-oss`. Non-main targeting was confirmed by the user on 2026-07-30.
    - [x] Create `conductor/release_2_0_0_package_alignment_mit_license_20260729` from the captured HEAD and perform all release work on it. Verified checked-out branch on 2026-07-30.
    - [x] Create or update the draft pull request using the approved specification as its description when the review surface is required. Draft PR #59: <https://github.com/0rail/transform-hub/pull/59>, targeting `feat/manager-oss`, was created from the approved `spec.md` on 2026-07-30.
- [x] Task: Delegate read-only inventory work to the configured research specialist and reconcile it in the track records. Reconciled in `inventory.md` on 2026-07-30.
    - [x] Inventory workspace manifests, publish configuration, current versions, licenses, internal dependency ranges, image references, and release scripts. Evidence and current-state table recorded in `inventory.md`.
    - [x] Classify STH, CLI, Manager, MultiManager, and every other Scramjet-owned package as included or excluded with a documented rationale. Candidate release boundary and ownership-evidence limitation recorded in `inventory.md`.
    - [x] Confirm legacy Verser, bpmux, frame-stream, and other upstream/external packages are excluded from the fixed 2.0.0 and MIT conversion set. The validation safeguards are recorded in `inventory.md`.
- [x] Task: Establish the release-history evidence baseline. Reconciled in `release-history.md` on 2026-07-30.
    - [x] Identify the public 1.0.1 release point, associated tags or published artifacts, and the Git history range through the planned 2.0.0 release. The committed 1.0.1 baseline, ancestry, and public-metadata verification gap are recorded in `release-history.md`.
    - [x] Record dated milestones, merged track outcomes, package changes, and known breaking changes that require release-note treatment. Curated source-backed milestones and migration candidates are recorded in `release-history.md`.
- [x] Task: Conductor - Phase Completion 'Establish Release Scope and Review Surface' (Protocol in workflow.md). Checkpoint commits `ecd71645` (scope evidence) and `14cb2fbd` (draft PR/review record) were pushed to the dedicated branch; the split is required because GitHub cannot create a pull request before the branch has a commit differing from its base.

### Phase 1 validation record

- `git diff --check` passed before the Phase 1 scope commit.
- The history baseline was verified locally with `git show`, ancestry, and commit-count checks: `7f97c217` (2024-03-13) is an ancestor of `db54d058` (2026-07-30); the range contains 967 commits and 271 first-parent commits.
- Draft PR #59 targets the approved `feat/manager-oss` base and uses `spec.md` as its description.
- Reviewer result: `PASS/no_issue`, scope `phase`; evidence confirms the review surface, required included/excluded boundary, verified/planned release-history distinction, and preservation of active tracks.
- Shared-code/deduplication check: not applicable; Phase 1 creates only Conductor release evidence and no runtime/package implementation.

## Phase 2: Build Deterministic Package and Dependency Alignment Tooling

- [x] Task: Review existing shared release helpers and alignment scripts before changing tooling. Decision recorded in `alignment-tooling.md` on 2026-07-30.
    - [x] Inspect `scripts/add-to-packages-json.js`, `scripts/bump-dependencies-versions.sh`, `scripts/bump_docker_images.sh`, root npm scripts, package-lock behavior, and release CI. The review confirmed unscoped manifest/image mutations, stale generated/absent-file handling, and legacy Yarn release workflows.
    - [x] Document why the release-specific alignment implementation is centralized rather than duplicated across scripts. The static boundary, deterministic modes, preservation rules, and test approach are recorded in `alignment-tooling.md`.
- [x] Task: Delegate the known alignment-tool implementation and focused tests to the configured implementation specialist. Parent verification passed on 2026-07-30.
    - [x] Consolidate package, internal dependency, image-tag, and release-metadata alignment into a deterministic supported workflow scoped to the included package inventory. `scripts/release-align.js` and `scripts/lib/release-boundary.js` are the single supported policy/command path; both CI and `publish:dist` use the boundary-restricted publisher.
    - [x] Provide a validation or dry-run mode that reports version drift, excluded-package mutations, and unresolved internal ranges without silently correcting unrelated packages. `check`, `dry-run`, and `apply` modes are covered by the focused suite.
    - [x] Update or add focused tests/fixtures that prove a successful 2.0.0 alignment, idempotent reruns, and failure on deliberate drift. `scripts/test/release-align.spec.js` passed all 24 cases through `scripts/run-ava.js` under the default memory guard.
    - [x] Update release-tooling documentation and `conductor/tech-stack.md` if the supported release command surface changes. `alignment-tooling.md` and `conductor/tech-stack.md` now document the supported alignment commands and release workspace boundary.
- [x] Task: Apply the approved alignment workflow to set the included package graph to `2.0.0`. The release-only npm workspace correction in `alignment-tooling.md` allowed npm to regenerate and reproduce the lockfile without modifying excluded manifests.
    - [x] Update manifest versions and included internal dependency, peer-dependency, and optional-dependency ranges. Independent `check` output confirmed every included package and included internal range at 2.0.0 while excluded manifests stayed unchanged.
    - [x] Update included Docker image references, release metadata, and the npm lockfile without changing excluded package versions or dependency policies. `npm install --ignore-scripts` regenerated `package-lock.json` from the release-only workspace; `npm ci --ignore-scripts` then reproduced it. Excluded manifests remain unchanged.
    - [x] Run the focused alignment checks, affected package tests through the supported AVA runner, and an npm dependency-resolution check. `npm run release:align:check`, `npm run release:align:dry-run`, and the 34-case AVA suite passed under the default memory guard; `npm install --ignore-scripts` regenerated the lockfile and `npm ci --ignore-scripts` reproduced it.
- [x] Task: Conductor - Phase Completion 'Build Deterministic Package and Dependency Alignment Tooling' (Protocol in workflow.md). Checkpoint commit `f075b1b2` was pushed to the dedicated branch after alignment validation and reviewer remediation; the P2 image-config assertion follow-up is retained in `td.md`.

### Phase 2 validation record

- `npm install --ignore-scripts` regenerated `package-lock.json`; `npm ci --ignore-scripts` reproduced the release-only workspace dependency graph. Neither command manually edited the lockfile.
- `npm run release:align:check` and `npm run release:align:dry-run` passed with every included package at 2.0.0 and all five excluded workspaces preserved.
- `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" node scripts/run-ava.js scripts/test/release-align.spec.js --serial` passed 34 tests. No per-test memory guard adoption was claimed; this focused tooling test does not retain child-process captures or run BDD.
- Reviewer remediation: the initial Phase 2 review blocked partial writes on validation errors. `apply` now fails closed before writing and the re-review returned `PASS/deferred`; the non-blocking missing image-config snapshot assertion is tracked in `td.md`.
- Shared-code/deduplication check: `scripts/lib/release-boundary.js` centralizes the release boundary for alignment, workspace validation, and publishing; no parallel package-specific logic was added.

## Phase 3: Convert Included Packages to MIT Distribution Licensing

- [x] Task: Validate the approved included-package boundary before changing license files or metadata. User direction on 2026-07-30 adds `@scramjet/runner-python` to the MIT, 2.0.0 version, and npm publish boundary; `scramjet-bdd` remains MIT licensing-only.
    - [x] Reconfirm that STH, CLI, Manager, MultiManager, and other classified Scramjet-owned packages are in scope.
    - [x] Reconfirm that legacy Verser and upstream/external packages remain excluded and retain their existing license files and manifest fields.
- [x] Task: Delegate bounded first-party license metadata and distribution-notice changes to the configured implementation specialist. Runner Python and BDD scope expansions are implemented and validated.
    - [x] Update included package manifests and package license/notices with the official SPDX/OSI MIT text and `Copyright (c) 2026 Scramjet Sp. z o.o.`.
    - [x] Ensure npm package contents retain the required license materials without modifying excluded packages. Every included package has its own MIT `LICENSE`, preventing root fallback content from being distributed.
    - [x] Add focused automated checks or checked fixtures that detect missing, inconsistent, or excluded-package license changes. The release-alignment AVA suite covers license field, text, root, idempotence, and exclusion invariants.

### License authorization record

- On 2026-07-30, the user confirmed the MIT license change on behalf of Scramjet Sp. z o.o. This confirms the track's authorized MIT conversion for the included set, Runner Python, and BDD; it does not alter the preserved upstream notices for bpmux and frame-stream.
- [x] Task: Verify the license conversion and publishable package contents. Focused license checks, representative package contents, Runner integration tests, and reviewer validation passed; the unavailable `rg`-dependent invariant helper is recorded as an environment limitation.
    - [x] Run focused license/inventory validation and `npm pack --dry-run` checks for representative STH, CLI, Manager, and MultiManager packages. The four 2.0.0 dry-run tarball manifests include MIT `LICENSE` files.
    - [x] Run the narrowest affected builds/tests and record any memory-guarded command, threshold, skip, or non-applicability evidence. After the user-approved host `python3-pip` installation, `npm --workspace=@scramjet/runner test` passed all 115 tests; no source-level AVA memory guard adoption was claimed. `npm run check:runtime-invariants` remains unavailable because `rg` is not installed.
    - [x] Request configured reviewer validation for the included/excluded boundary and MIT notice coverage. Reviewer re-review passed the Runner Python Docker publish path after staged-context and verified-verser2-wheel remediation.
- [x] Task: Conductor - Phase Completion 'Convert Included Packages to MIT Distribution Licensing' (Protocol in workflow.md). Phase checkpoint includes user-authorized MIT conversion, Runner Python npm publication support, and self-contained Docker dependency installation.

## Phase 4: Publish the 2.0.0 Changelog

- [ ] Task: Produce the complete curated 2.0.0 changelog from the established 1.0.1-to-2.0.0 evidence range.
    - [ ] Include important dates, material package and product changes, breaking changes, migration guidance, and release acknowledgments.
    - [ ] Cross-check changelog claims against Git history, published release evidence, and completed track records; distinguish verified facts from planned work.
    - [ ] Add a reproducible source-change/package-version inventory or appendix supporting the curated history.
- [ ] Task: Delegate focused changelog documentation review to the configured reviewer and correct in-scope clarity or release-history defects.
- [ ] Task: Conductor - Phase Completion 'Publish the 2.0.0 Changelog' (Protocol in workflow.md)

## Phase 5: Curate Legacy Documentation, Conductor Records, and Future Roadmap

- [ ] Task: Classify remaining feature-request documentation and prepare a traceable cleanup proposal.
    - [ ] Identify completed, obsolete, actionable, and historically relevant requests in the legacy roadmap documentation.
    - [ ] Delegate non-Conductor documentation cleanup to the configured cleanup specialist only after the proposed removals/archives are bounded and reviewer-safe.
    - [ ] Redirect, archive, or retain each item with traceability; do not silently discard material that remains relevant.
- [ ] Task: Review old Conductor tracks and registry entries without touching active tracks.
    - [ ] Have the main Conductor session prepare an archival/consolidation proposal for completed or stale records and preserve their registry links or archive paths.
    - [ ] Request configured reviewer safety review before any broad move, deletion, or registry rewrite.
    - [ ] Apply only approved Conductor-record changes and verify all retained links.
- [ ] Task: Convert the selected official Scramjet grants-page HTML into the grants acknowledgment Markdown.
    - [ ] Recheck `https://scramjet.org/grants/` immediately before conversion, retain the source URL and retrieval date, and select only the intended grants section.
    - [ ] Use an HTML-to-Markdown conversion workflow for the selected source section; preserve the project headings and the source wording for `Total budget` and `NCBiR grant`, including the applicable amounts and programme context.
    - [ ] Add the converted Markdown with clear attribution and no unsupported endorsement or funding claims, then validate source fidelity, links, and rendered Markdown.
- [ ] Task: Conductor - User Manual Verification 'Grant HTML-to-Markdown Conversion'.
    - [ ] Commit and push the scoped phase work to the dedicated branch and create or update the draft pull request before requesting the checkpoint.
    - [ ] Present the converted Markdown and its official source reference for confirmation before continuing with the final roadmap interview.
- [ ] Task: Conduct the final stakeholder interview about `roadmap.md`.
    - [ ] Decide the roadmap's purpose, included future changes, ownership, update cadence, and how it relates to archived feature requests.
    - [ ] Record the interview decision and create `roadmap.md` only when the decision explicitly authorizes it.
    - [ ] If no roadmap is authorized, retain the decision record and complete documentation cleanup without creating the file.
- [ ] Task: Conductor - Phase Completion 'Curate Legacy Documentation, Conductor Records, and Future Roadmap' (Protocol in workflow.md)

## Phase 6: Release Verification and Pull-Request Finalization

- [ ] Task: Perform end-to-end release consistency validation.
    - [ ] Run the alignment validator, license/inventory checks, `npm run build:packages`, focused package tests, and `npm run lint` using the repository-supported commands.
    - [ ] Escalate to serial package tests, runtime invariant checks, or BDD smoke tests only when changed surfaces require them; record every command and any skipped validation with reason.
    - [ ] Verify the final changelog, grants acknowledgment, links, included package versions, internal ranges, and excluded package invariants.
- [ ] Task: Complete production-focused review and remediate in-scope findings.
    - [ ] Request configured reviewer assessment of the specification, plan outcomes, licensing boundary, release tooling, and documentation evidence.
    - [ ] Record safe deferred findings with their rationale; escalate material strategic blockers only when reviewer output requires it.
- [ ] Task: Finalize the release pull request.
    - [ ] Commit each completed phase on the dedicated branch, push phase checkpoints, and post verification results as pull-request comments.
    - [ ] Ensure the draft pull request targets the captured base branch, has the approved specification as its description, and is ready for review only after final verification passes.
- [ ] Task: Conductor - Phase Completion 'Release Verification and Pull-Request Finalization' (Protocol in workflow.md)

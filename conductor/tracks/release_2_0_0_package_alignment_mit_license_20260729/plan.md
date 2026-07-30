# Implementation Plan: Release 2.0.0

## Phase 1: Establish Release Scope and Review Surface

- [~] Task: Establish the dedicated implementation branch and release review surface.
    - [x] Capture the current branch as the pull-request base and apply branching-policy checks for a dirty worktree, non-main base, upstream availability, unpushed commits, and divergence. Base: `feat/manager-oss` at `db54d058fb4d71dca958272ca67fccff793a9970`; clean, tracked, and synchronized with `origin/feat/manager-oss`. Non-main targeting was confirmed by the user on 2026-07-30.
    - [x] Create `conductor/release_2_0_0_package_alignment_mit_license_20260729` from the captured HEAD and perform all release work on it. Verified checked-out branch on 2026-07-30.
    - [ ] Create or update the draft pull request using the approved specification as its description when the review surface is required.
- [x] Task: Delegate read-only inventory work to the configured research specialist and reconcile it in the track records. Reconciled in `inventory.md` on 2026-07-30.
    - [x] Inventory workspace manifests, publish configuration, current versions, licenses, internal dependency ranges, image references, and release scripts. Evidence and current-state table recorded in `inventory.md`.
    - [x] Classify STH, CLI, Manager, MultiManager, and every other Scramjet-owned package as included or excluded with a documented rationale. Candidate release boundary and ownership-evidence limitation recorded in `inventory.md`.
    - [x] Confirm legacy Verser, bpmux, frame-stream, and other upstream/external packages are excluded from the fixed 2.0.0 and MIT conversion set. The validation safeguards are recorded in `inventory.md`.
- [x] Task: Establish the release-history evidence baseline. Reconciled in `release-history.md` on 2026-07-30.
    - [x] Identify the public 1.0.1 release point, associated tags or published artifacts, and the Git history range through the planned 2.0.0 release. The committed 1.0.1 baseline, ancestry, and public-metadata verification gap are recorded in `release-history.md`.
    - [x] Record dated milestones, merged track outcomes, package changes, and known breaking changes that require release-note treatment. Curated source-backed milestones and migration candidates are recorded in `release-history.md`.
- [ ] Task: Conductor - Phase Completion 'Establish Release Scope and Review Surface' (Protocol in workflow.md)

## Phase 2: Build Deterministic Package and Dependency Alignment Tooling

- [ ] Task: Review existing shared release helpers and alignment scripts before changing tooling.
    - [ ] Inspect `scripts/add-to-packages-json.js`, `scripts/bump-dependencies-versions.sh`, `scripts/bump_docker_images.sh`, root npm scripts, package-lock behavior, and release CI.
    - [ ] Document why the release-specific alignment implementation is centralized rather than duplicated across scripts.
- [ ] Task: Delegate the known alignment-tool implementation and focused tests to the configured implementation specialist.
    - [ ] Consolidate package, internal dependency, image-tag, and release-metadata alignment into a deterministic supported workflow scoped to the included package inventory.
    - [ ] Provide a validation or dry-run mode that reports version drift, excluded-package mutations, and unresolved internal ranges without silently correcting unrelated packages.
    - [ ] Update or add focused tests/fixtures that prove a successful 2.0.0 alignment, idempotent reruns, and failure on deliberate drift.
    - [ ] Update release-tooling documentation and `conductor/tech-stack.md` if the supported release command surface changes.
- [ ] Task: Apply the approved alignment workflow to set the included package graph to `2.0.0`.
    - [ ] Update manifest versions and included internal dependency, peer-dependency, and optional-dependency ranges.
    - [ ] Update included Docker image references, release metadata, and the npm lockfile without changing excluded package versions or dependency policies.
    - [ ] Run the focused alignment checks, affected package tests through the supported AVA runner, and an npm dependency-resolution check.
- [ ] Task: Conductor - Phase Completion 'Build Deterministic Package and Dependency Alignment Tooling' (Protocol in workflow.md)

## Phase 3: Convert Included Packages to MIT Distribution Licensing

- [ ] Task: Validate the approved included-package boundary before changing license files or metadata.
    - [ ] Reconfirm that STH, CLI, Manager, MultiManager, and other classified Scramjet-owned packages are in scope.
    - [ ] Reconfirm that legacy Verser and upstream/external packages remain excluded and retain their existing license files and manifest fields.
- [ ] Task: Delegate bounded first-party license metadata and distribution-notice changes to the configured implementation specialist.
    - [ ] Update included package manifests and package license/notices with the standard MIT text and the required copyright notice.
    - [ ] Ensure npm package contents retain the required license materials without modifying excluded packages.
    - [ ] Add focused automated checks or checked fixtures that detect missing, inconsistent, or excluded-package license changes.
- [ ] Task: Verify the license conversion and publishable package contents.
    - [ ] Run focused license/inventory validation and `npm pack --dry-run` checks for representative STH, CLI, Manager, and MultiManager packages.
    - [ ] Run the narrowest affected builds/tests and record any memory-guarded command, threshold, skip, or non-applicability evidence.
    - [ ] Request configured reviewer validation for the included/excluded boundary and MIT notice coverage.
- [ ] Task: Conductor - Phase Completion 'Convert Included Packages to MIT Distribution Licensing' (Protocol in workflow.md)

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

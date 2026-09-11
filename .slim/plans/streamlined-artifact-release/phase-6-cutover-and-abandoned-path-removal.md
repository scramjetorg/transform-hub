# Phase 6 — Cutover and Abandoned-Path Removal

## Outcome

The new workflow is the only active release path, remote required checks reference it, and superseded scripts/workflows are removed safely.

## Tasks

- [ ] Inventory all current release/CI scripts, workflows, npm scripts, documentation, required checks, environment policies, and external automation references.
- [ ] Classify each item as retained, replaced, or removed; obtain an explicit user decision for each legacy workflow and npm script before deletion.
- [ ] Rename each selected abandoned executable script to an `unused-*` prefix while intentionally leaving callers unchanged; run every automatic and manual workflow entrypoint to expose live references before removing the scripts.
- [ ] Remove only after Phase 4–5 evidence and remote protection changes are confirmed:
  - [ ] transformed prerelease publication and prerelease-BDD paths, including `scripts/release-prerelease.js`, `scripts/release-prerelease-bdd.js`, and their dedicated tests/workflow hooks.
  - [ ] directory-based legacy publisher `scripts/publish-order-dist-packages.js` and callers.
  - [ ] superseded `pr-validate`, `devel-validate`, `devel-bdd-image`, `main-release`, and release-PR automation workflow implementations, replaced by the target trigger workflows.
  - [ ] obsolete npm scripts, test fixtures, docs, check names, caches, artifacts, and GitHub Packages prerelease conventions.
- [ ] Preserve only reusable neutral primitives such as release-boundary/wave definitions after ownership and target-contract review; do not preserve an old workflow solely because it exists.
- [ ] Perform a complete documentation sweep: update operator/developer docs, workflow diagrams, npm script help, manual-run instructions, runbooks, release/checkpoint references, and stale links with the target trigger map, local validation commands, recovery procedure, permissions, and no-rebuild invariants.
- [ ] Remove stale remote required checks and configure new required checks/environments before enabling the target release path.
- [ ] Perform a staged cutover rehearsal and verify no active trigger can reach an abandoned publisher or transformed prerelease path.

## Acceptance Criteria

- Every active workflow maps to the target trigger table and artifact contract.
- No references to removed scripts/workflows remain in repository or confirmed remote configuration.
- The new path completes a rehearsal without invoking transformed prerelease or directory publication code.

## Validation Evidence

- Reference search report, workflow policy suite, remote required-check/environment confirmation, and cutover rehearsal record.

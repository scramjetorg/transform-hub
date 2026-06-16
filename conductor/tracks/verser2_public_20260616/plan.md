# Implementation Plan: Clean verser2 GitHub token override from public surface

## Phase 1: Public Surface Cleanup and Validation

- [ ] Task: Audit public-facing token guidance
    - [ ] Search docs, README files, examples, package metadata, generated docs sources, CLI-visible text, and scripts for verser2-specific GitHub Packages token guidance.
    - [ ] Classify each match as public-facing, internal maintainer/agent-only, historical Conductor context, or unrelated dependency metadata.
    - [ ] Record the audit findings and cleanup targets in the track notes.
- [ ] Task: Confirm helper ownership and install behavior
    - [ ] Locate the reusable GitHub Packages helper/recovery path.
    - [ ] Confirm which scripts or package install paths still rely on the helper while verser2 remains on GitHub Packages.
    - [ ] Identify wording that should become generic rather than verser2-specific.
- [ ] Task: Clean public documentation and messaging
    - [ ] Update public docs, README content, examples, or surfaced script messages to avoid telling users to configure GitHub tokens specifically for verser2.
    - [ ] Keep any required install messaging generic and private-package-oriented where appropriate.
    - [ ] Ensure no tokens, secret examples, or private credential values are introduced.
- [ ] Task: Preserve internal recovery notes
    - [ ] Update internal Conductor/known-solution notes only if needed so maintainers can still recover authenticated GitHub Packages installs.
    - [ ] Keep internal notes clearly scoped as private maintainer/agent recovery information, not public verser2 setup documentation.
    - [ ] Preserve the reusable helper for future private package needs.
- [ ] Task: Validate cleanup and no behavior drift
    - [ ] Rerun targeted searches for verser2 GitHub token override wording across public surfaces.
    - [ ] Verify remaining matches are internal-only, historical, or unrelated and document the rationale.
    - [ ] Run `npm run check:verser2-packages` if install/auth-related scripts or package resolution guidance changed.
    - [ ] Run `npm run lint` or targeted lint only if source/script files changed.
    - [ ] Run `npm run build:packages` only if package/source behavior or generated package output changes.
- [ ] Task: Finalize track artifacts
    - [ ] Update the track plan with validation results, skipped checks, and rationale.
    - [ ] Update PR/body or handoff notes if this track is attached to an active PR.
    - [ ] Commit scoped changes after validation passes.
- [ ] Task: Conductor - User Manual Verification 'Public Surface Cleanup and Validation' (Protocol in workflow.md)

# Scripts and Dependencies Cleanup and Update

## Overview

Reduce obsolete maintenance surface and remediate dependency risk without changing supported Hub, CLI, adapter, runner, API, or sequence behavior. Work proceeds in this order: script cleanup, direct dependency removal, then dependency updates.

## Functional Requirements

### Script cleanup

- Remove the proven-unreferenced legacy scripts and build assets:
  - `scripts/validate-bdd-archive.js`
  - `scripts/test-all.sh`
  - `build/Dockerfile`
  - `build/package.json` and the empty `build/` directory.
- Before each deletion, repeat repository, package-script, workflow, runtime, test, and documentation reference checks.
- Inventory potential legacy-script candidates separately, including `scripts/_/pack-sequence`, `scripts/_/upload-sequence`, and `scripts/packsequence.js`.
- Do not delete compatibility-sensitive or documented script entrypoints without an explicit follow-up decision and a migration/removal plan.

### Dependency removal

- After script cleanup is validated, inventory all direct dependency-removal candidates across root and workspace manifests.
- Remove only dependencies proven unused by source, runtime loading, package scripts, workflow/release tooling, tests, fixtures, generated outputs, and documentation.
- Retain dependencies required by active validation or runtime paths, including `@vscode/ripgrep`, BDD/Cucumber support, runtime wrapper packages, compatibility types, and explicitly retained legacy packages.
- Regenerate `package-lock.json` only with npm after approved manifest removals; do not hand-edit lockfile metadata.

### Dependency updates

- After dependency removal is validated, remediate retained runtime and development/tooling audit findings in owner-scoped groups.
- Prioritize production-reachable critical and high findings, including archive-processing, Docker-adapter, Kubernetes-client, HTTP, YAML, WebSocket, and protobuf dependency chains.
- Treat major upgrades and behavior-changing migrations as explicit compatibility tasks with focused regression evidence; do not use `npm audit fix --force` or permanent overrides as substitutes for verification.
- Update development and test tooling only after the production dependency changes have a recorded behavior checkpoint.

## Process and Evidence Requirements

- At the end of each general phase, perform a scope review for the next phase before changing it.
- Record exact handoff notes: completed work, retained or deferred candidates, dependency/version decisions, validation results, known failures, and next-phase entry criteria.
- Keep script removal, dependency removal, compatible runtime updates, and major/tooling migrations in separate commits and review scopes.
- Use npm and repository-supported test runners only.
- Create a dedicated implementation branch and draft pull request from the captured base branch during implementation.

## Acceptance Criteria

- The four approved legacy script/build deletion targets are absent and have no remaining references.
- Every other removal candidate has evidence-backed status: removed, retained, or deferred with rationale and owner.
- Each removed dependency is absent from its manifest and no longer resolved as a direct lockfile dependency after a clean npm install.
- Production audit results improve or every residual has a documented dependency path, exposure classification, remediation plan, and owner.
- Runtime and tooling updates preserve affected package builds, supported tests, runtime invariants, and relevant adapter or BDD behavior.
- Every phase has a completed scope review and handoff record before the next phase begins.
- No change introduces a new validation failure or undocumented public/runtime behavior change.

## Constraints

- Preserve supported process, Docker, Kubernetes, Node, Python, and Bun behavior unless a separately approved migration explicitly changes it.
- Do not fold Kubernetes decoupling, MinIO storage replacement, or deprecated-type package removal into this track.
- Do not remove documented sequence packaging interfaces without an explicit compatibility decision.
- Do not publish packages, images, or modify external registry, GitHub environment, or trusted-publisher configuration.

## Out of Scope

- Replacing runtime adapters or storage implementations.
- Changing the supported Node/npm policy except where a dependency update demonstrably requires an approved policy change.
- Blind lockfile refreshes or forceful audit remediation.
- Unrelated code-style cleanup or feature work.

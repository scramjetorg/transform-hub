# Dependencies Update and Cleanup

## Overview

Reduce direct dependency risk and maintenance cost while preserving the current production behavior and test baseline.

## Functional Requirements

- Establish and record a full serial package-test baseline before any test-runner or test-tool dependency changes; record pre-existing failures in `td.md` without fixing them in this track phase.
- Remove proven-unused direct dependencies and corresponding stale type declarations.
- Achieve a clean production dependency audit, resolving retained direct production vulnerabilities through removal, compatible upgrades, or scoped implementation changes.
- Retain process and Docker adapters; remove only Kubernetes-adapter wiring from STH so normal STH installs/builds do not require the Kubernetes adapter dependency tree.
- Preserve Kubernetes source code but exclude Kubernetes dependency remediation from this track.
- Standardize retained S3 storage code on `pico-s3` and remove MinIO-backed Manager storage without MinIO compatibility testing.
- Update the direct npm development dependency to the newest supported release and keep it as a development dependency.
- Evaluate raising the minimum supported Node.js version to v22 LTS; make the change only if CI, metadata, and compatibility evidence support it.
- Defer BDD Dockerode 3→4 and test-runner/tooling dependency migrations until after production behavior is baselined and production changes complete.
- Record all risky or behavior-affecting development dependency migrations in `td.md` and decide their disposition at track end.

## Non-Functional Requirements

- Do not knowingly change Hub, CLI, API, process-adapter, Docker-adapter, runner, or sequence behavior.
- Keep changes grouped by ownership; do not mix removals, routine upgrades, and major migrations in one phase.
- Do not use forceful audit fixes or permanent overrides as a substitute for compatibility verification.

## Acceptance Criteria

- Production `npm audit --omit=dev` has no unresolved vulnerabilities, or each residual has an explicit documented rationale approved at track end.
- The full package-suite baseline and post-production-change validation results are recorded, including known pre-existing failures.
- STH no longer wires the Kubernetes adapter, while process and Docker adapter builds remain intact.
- MinIO-backed storage and its direct dependencies are removed; retained S3 behavior is implemented through pico-s3.
- Test dependency phases occur only after immutable production behavior evidence is captured.
- `td.md` lists every deferred/tricky development migration and its final track-end disposition.

## Out of Scope

- Kubernetes adapter dependency upgrades, compatibility testing, or source removal.
- MinIO compatibility testing or migration support.
- BDD Dockerode 3→4 migration.
- Test-runner/tooling major migrations before production behavior is locked.

## Constraints

- Use npm and repository-supported test runners.
- Preserve current tests and behavior; do not repair unrelated baseline failures.
- Create a follow-up note for install-time adapter plugins, including optional Kubernetes installation rather than build-time inclusion.

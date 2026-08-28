# Behavioral Tests Migration and Cleanup

## Overview

Move behavioral tests that execute production artifacts or cross process, network, TLS/mTLS, service, storage, or runtime boundaries out of package AVA suites and into the Cucumber stack. Rebuild the migrated scenarios to improve behavioral coverage, isolation, diagnostics, and runtime realism rather than preserving AVA test structure.

This track continues on the current branch. AVA remains the home for deterministic, mocked, single-unit contracts only.

## Functional Requirements

1. Define and apply an auditable AVA/BDD boundary for this migration:
   - Keep an AVA test only when it invokes one unit directly and replaces outbound or nondeterministic collaborators with fakes or in-memory implementations.
   - Move tests that execute CLI, Hub, Manager, MultiManager, runner, or runtime artifacts; open real network listeners or clients; use TLS/mTLS; invoke external services; compose production components; or validate observable filesystem/configuration behavior through real entrypoints.
2. Reproduce CLI behavioral coverage in Cucumber, including real CLI process execution, mTLS and non-mTLS ingress, API/endpoint dispatch, profile selection, isolated profile/session state, cancellation/signals, and meaningful exit-code outcomes.
3. Reproduce Host and Manager control-plane behavior in Cucumber, including mTLS client admission and rejection, fingerprint/trust behavior, external-broker routing, and CSR-enrollment CLI behavior.
4. Reproduce runner and runtime-wrapper behavior in Cucumber through full artifacts and fixture sequences. Cover successful execution, streamed input/output, lifecycle completion or stop behavior, failure diagnostics, and runtime-specific behavior where supported by the BDD environment.
5. Reproduce external-service behavior in Cucumber for MinIO/S3 client and proxy flows using real service infrastructure. Add Docker-daemon behavior only when the BDD runtime can access the daemon safely and repeatably; otherwise retain a documented, isolated fallback until that prerequisite is available.
6. Rewrite every migrated scenario for Cucumber rather than mechanically translating AVA setup, assertions, shared fixtures, timeouts, or cleanup. Each scenario must own isolated temporary/profile/config state, ports, processes, and service resources.
7. Remove migrated behavioral cases and their AVA-only harness code. Preserve or replace only the portions that remain deterministic, mocked, and single-unit under the boundary.
8. Avoid duplicating behavior already covered by existing Cucumber scenarios. Extend existing CLI, Hub, Manager, Verser2, and runner feature areas where that produces a clearer user-visible journey; add features only for distinct behavior such as ingress admission or S3 proxying.

## Non-Functional Requirements

- Use the supported Cucumber runner and its Docker mode for behavioral validation. Keep process and container cleanup observable through the existing leak-detection paths.
- Tag infrastructure-dependent scenarios so focused CI selection is possible and unavailable Docker prerequisites are explicit rather than silently skipped.
- Preserve production artifact execution: BDD scenarios must exercise built artifacts or the supported source-spawn mode, not reimplement behavior with mocks.
- Use per-scenario setup and teardown; do not retain AVA global fixtures, shared OS-home paths, or session-global configuration state.
- Run memory-guarded BDD validation for migrated scenarios and record command, thresholds, exceptions, and any unavailable prerequisite. Do not claim AVA memory-guard coverage for scenarios removed from AVA.
- Keep validations focused first, then run cross-package BDD smoke and relevant package build/lint checks before completion.

## Acceptance Criteria

- [ ] No AVA test retained by this track crosses the defined behavioral boundary.
- [ ] Cucumber covers real CLI ingress for mTLS and non-mTLS paths, profile selection, cancellation/signals, endpoint/API dispatch, and representative success and failure exit codes.
- [ ] Cucumber covers Host and Manager control-ingress admission/rejection, trust/fingerprint behavior, external routing, and CSR-enrollment CLI behavior.
- [ ] Cucumber covers complete runner/runtime artifact journeys with fixture sequences, input/output, lifecycle outcomes, and actionable failure behavior without duplicating existing coverage.
- [ ] Cucumber covers real MinIO/S3 object streaming and Manager proxy behavior; Docker-daemon behavior is covered by a repeatable tagged scenario or retained only behind an explicit documented BDD-environment prerequisite.
- [ ] Rewritten scenarios run independently and clean up profiles, config files, listeners, processes, containers, and temporary artifacts.
- [ ] Migrated AVA tests and obsolete integration harnesses are removed; retained AVA tests are deterministic single-unit contracts.
- [ ] Focused BDD paths, relevant package tests, package builds, lint, and memory-guarded BDD evidence pass with no track-caused leaks or failures.

## Risks and Constraints

- Cucumber Docker mode requires access to the Docker daemon for MinIO and Docker-adapter scenarios; image availability and daemon access must be verified before migration.
- TLS/mTLS and CSR scenarios require test PKI fixtures without exposing credentials in artifacts or logs.
- Runner scenarios must remain compatible with supported Node and Python runtime environments; Bun coverage depends on a supported BDD image/runtime.
- Existing BDD scenarios already cover parts of CLI, Manager forwarding, and runner completion. The migration must consolidate rather than duplicate them.

## Out of Scope

- Changing production CLI, ingress, runner, adapter, storage, or protocol semantics.
- Moving deterministic mocked unit tests from AVA solely because they use filesystem helpers, tar/gzip utilities, or isolated spawn fakes internally.
- Kubernetes cluster integration testing unless a real-cluster prerequisite is separately approved.
- Replacing all package-level AVA coverage or changing the repository-wide test framework.

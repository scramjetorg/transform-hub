# Specification: Coverage Tooling Replacement

## Overview

Rebuild repository code-coverage metrics from scratch. Remove repository-owned nyc/Istanbul coverage tooling, then add an opt-in c8 mode to the supported AVA runner. This track establishes reliable metrics; it does not require historical parity or coverage-gap remediation.

## Functional Requirements

- Remove direct nyc and repository-owned Istanbul dependencies, scripts, configuration, report artifacts, and active coverage flows; refresh `package-lock.json` with npm.
- Permit c8's transitive implementation dependencies.
- Inventory active coverage references and remove or update only active repository-owned coverage wiring; preserve historical records and unrelated text.
- Add an opt-in coverage flag to `scripts/run-ava.js` that runs supported AVA tests through c8 without changing default test behavior.
- Produce reproducible overall and package/file metrics from original TypeScript source paths.
- Exclude generated, staged, build, dependency, and coverage-output artifacts from reported source metrics.
- Diagnose and fix failures caused by coverage mode, including runner propagation, source-map remapping, report generation, and cleanup timing.

## Acceptance Criteria

- No active nyc/Istanbul configuration, script, direct dependency, or repository-owned report flow remains.
- A clean npm installation succeeds after each dependency transition.
- Default AVA commands retain their supported runner behavior without collecting coverage.
- The opt-in runner flag produces c8 metrics for the defined AVA source scope without `.ava-*`, generated, or build-artifact entries.
- No historical-coverage parity comparison, threshold, CI gate, or BDD-container coverage flow is introduced.
- Phase 5 records overall totals, package/file detail, zero-hit files, and scope anomalies, then stops for a user decision before any test, source, exclusion, or threshold changes intended to address gaps.

## Out of Scope

- Coverage remediation, test deletion, threshold definition, CI enforcement, and Docker BDD instrumentation.
- Preserving nyc behavior, reports, exclusions, thresholds, or metric parity.

## Risks

c8 uses V8 metrics, so source-map attribution and child-process inheritance must be proven against the staged AVA runner. The coverage inventory must distinguish active tooling from archives and unrelated text.

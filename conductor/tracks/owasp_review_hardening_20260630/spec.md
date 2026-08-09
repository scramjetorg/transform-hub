# Specification: OWASP Review Hardening

## Overview

Create an OWASP-informed hardening track for Scramjet Transform Hub production packages. The track will inspect the repository's production package code, identify applicable OWASP/ASVS/CWE risks across the full hardening surface, and then require an explicit per-finding decision before any implementation work: **Fix**, **Document**, or **Ignore**.

The scope is intentionally end-to-end across the product's security-sensitive surfaces, but implementation must remain non-breaking by default and decision-driven rather than applying broad hardening changes automatically.

## Goals

- Build a production-code security hardening inventory mapped to relevant OWASP/ASVS/CWE themes.
- Cover the primary risk areas identified during planning research:
  - API surface hardening: CORS, security headers, request limits, route validation, and documented auth boundary assumptions.
  - Upload and storage hardening: archive extraction, path containment, package/file size controls, and unsafe file handling risks.
  - Runtime and adapter hardening: process/Docker/Kubernetes isolation, runner environment exposure, command execution surfaces, and Kubernetes security context concerns.
  - Config and logging hardening: safe merge behavior, prototype pollution, secret masking, TLS/mTLS configuration, and log redaction.
- Require a plan-level decision checkpoint for each finding before work proceeds on that finding: **Fix**, **Document**, or **Ignore**.
- Prefer non-breaking behavior: additive helpers, opt-in controls, warnings, documentation, or compatibility-preserving validation over hard default changes.
- Validate selected fixes with existing focused validation commands where practical.

## Functional Requirements

1. Review production package code only for the initial inventory.
   - Exclude test files, specs, fixtures, mocks, BDD scenarios, and generated build outputs from the review inventory.
2. Produce a prioritized list of applicable hardening findings.
   - Each finding must include affected package/path, risk summary, OWASP/ASVS/CWE mapping where practical, severity/priority, confidence, compatibility impact, and recommended action.
3. Before implementing or documenting any finding, record a decision task in `plan.md` choosing exactly one outcome:
   - **Fix**: implement a non-breaking hardening change where feasible.
   - **Document**: document the risk, operational assumption, or mitigation without product-code behavior changes.
   - **Ignore**: explicitly accept/defer the finding with rationale.
4. If a finding is selected for **Fix**, keep the implementation focused and compatible with existing behavior unless the user explicitly approves otherwise.
5. If a finding is selected for **Document**, update the most appropriate project or package documentation without changing runtime behavior.
6. If a finding is selected for **Ignore**, record the rationale in the plan and do not modify product code for that finding.
7. Use existing focused tests and validation commands for selected fixes when available; avoid adding new tests unless the implementation cannot be reasonably validated otherwise.

## Non-Functional Requirements

- Preserve current public APIs, runtime protocol behavior, deployment defaults, and adapter compatibility unless explicitly approved later.
- Keep security primitives shared where reuse is clearly beneficial, but avoid large architecture changes without a separate decision.
- Maintain clear traceability from each finding to its disposition and validation status.
- Avoid broad formatting churn or unrelated refactors.

## Out of Scope

- Implementing a new central authentication/authorization system.
- Introducing breaking security defaults without explicit approval.
- Adding new SAST/SCA tooling or CI dependency-policy automation.
- Broad BDD, Docker, or Kubernetes end-to-end validation unless a selected fix specifically requires it.
- Treating tests, fixtures, mocks, BDD scenarios, or generated outputs as part of the initial security inventory.

## Acceptance Criteria

- A production-code OWASP hardening inventory is completed and mapped to the selected risk areas.
- Every identified finding has an explicit plan-level decision: Fix, Document, or Ignore.
- No finding is implemented without its decision checkpoint being completed first.
- Selected fixes are non-breaking or explicitly approved if compatibility risk is unavoidable.
- Selected fixes are validated with existing focused package-level checks where available.
- Documentation-only and ignored findings include a clear rationale.
- The final plan records completed work, validation commands run, skipped validation with reasons, and remaining deferred risks.

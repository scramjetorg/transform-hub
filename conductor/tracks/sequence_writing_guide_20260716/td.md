## P2-20260716-source-summary-input-validation

- **Finding identity:** source-summary input validation claim
- **Severity / scope:** P2 / phase 1
- **Evidence:** `docs-source/examples/source-side-data-summary.md` validates a
  relative file path but does not validate source-summary shape or numeric byte
  values while its prose says both are validated.
- **Disposition:** deferred
- **Rationale:** The walkthrough is type-checked and its streamable output is
  validated. Expanding its runtime input-validation example is non-blocking
  documentation refinement; Phase 1’s required resource and cursor contracts
  are covered.
- **Follow-up:** At track finalization, either align the prose with the snippet
  or add shape, finite-number, and non-negative-byte validation with snippet
  coverage.

## P2-20260716-live-compose-resource-capacity

- **Finding identity:** live Compose validation host capacity
- **Severity / scope:** P2 / out-of-scope environment
- **Evidence:** The current-image Compose smoke built and reached Hub readiness
  plus HTTP 200 exposed-route availability, but the opt-in AVA/Docker execution
  exhausted constrained host resources before a clean runner result.
- **Disposition:** deferred
- **Rationale:** Oracle confirmed the implementation path and structural smoke;
  the remaining issue is validation-host capacity, not a Phase 2 behavior defect.
- **Follow-up:** On a sufficiently provisioned host, run the live Compose smoke
  with `SCRAMJET_COMPOSE_LIVE=1 node scripts/run-ava.js
  scripts/test/compose-live-smoke.spec.js` under the repository safeguards.

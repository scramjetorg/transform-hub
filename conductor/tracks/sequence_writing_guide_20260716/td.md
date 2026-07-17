## P2-20260716-source-summary-input-validation

- **Finding identity:** source-summary input validation claim
- **Severity / scope:** P2 / phase 1
- **Evidence:** `docs-source/examples/source-side-data-summary.md` now
  validates summary shape, relative file names, finite byte values, and
  non-negative bytes before aggregation.
- **Disposition:** rejected as deferred; repaired in-track
- **Rationale:** Strict snippet evidence covers the repaired validation claim.
- **Follow-up:** None.

## P2-20260716-live-compose-resource-capacity

- **Finding identity:** live Compose validation host capacity
- **Severity / scope:** P2 / out-of-scope environment
- **Evidence:** The current-image Compose smoke built and reached Hub readiness
  plus HTTP 200 exposed-route availability, but the opt-in AVA/Docker execution
  exhausted constrained host resources before a clean runner result.
- **Disposition:** accepted deferred environment follow-up
- **Rationale:** Oracle confirmed the implementation path and structural smoke;
  the remaining issue is validation-host capacity, not a Phase 2 behavior defect.
- **Follow-up owner:** CI/validation environment maintainer. On a sufficiently
  provisioned host, run the live Compose smoke
  with `SCRAMJET_COMPOSE_LIVE=1 node scripts/run-ava.js
  scripts/test/compose-live-smoke.spec.js` under the repository safeguards.

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

## P2-20260716-manager-level-cli-routing

- **Finding identity:** installed CLI Manager-level Hub discovery and selection
- **Severity / scope:** P2 / enterprise Middleware capability
- **Evidence:** The development `si` client targets a selected Hub route through
  the CPM proxy; Manager-level `si hub list` and `si hub use` require the
  enterprise Middleware API topology.
- **Disposition:** accepted deferred product follow-up
- **Rationale:** The Compose guide uses an externally supplied CPM URL and does
  not claim Manager-level CLI routing is available in the current open topology.
- **Follow-up owner:** Middleware/API product owner. Add Manager-level Hub
  discovery and selection support to the non-enterprise CLI/API path, then
  document the supported endpoint and commands.

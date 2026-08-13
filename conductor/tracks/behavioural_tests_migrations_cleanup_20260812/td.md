# Deferred Items

## Closed

- **Finding:** Add callback-level Docker and MinIO prerequisite-diagnostic tests when the first tagged scenarios are introduced.
  - **Disposition:** resolved in final remediation
  - **Resolution:** `scripts/test/bdd-scenario-isolation.spec.js` invokes both registered `Before` callbacks, proves each calls its availability prerequisite before enabling cleanup diagnostics, and proves Docker/MinIO availability errors propagate without enabling diagnostics.

- **Finding:** Ensure CI selects the `@ci-runner-node` E2E-017 scenarios before track closure.
  - **Disposition:** resolved in Phase 5
  - **Resolution:** `test:bdd-ci-node` now explicitly selects `@ci-runner-node` while preserving the `@slow` exclusion for ordinary `@ci-instance-node` coverage.

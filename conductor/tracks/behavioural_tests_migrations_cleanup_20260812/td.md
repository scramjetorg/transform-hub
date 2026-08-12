# Deferred Items

## Phase 1

- **Finding:** Add callback-level Docker and MinIO prerequisite-diagnostic tests when the first tagged scenarios are introduced.
  - **Disposition:** deferred
  - **Rationale:** Registration-level coverage proves both public and internal tags activate one hook. Callback behavior depends on scenario infrastructure and is better verified with the first real tagged journey.

## Phase 3

- **Finding:** Ensure CI selects the `@ci-runner-node` E2E-017 scenarios before track closure.
  - **Disposition:** deferred
  - **Rationale:** The standard Node BDD selector currently uses `@ci-instance-node`; E2E-017 has a distinct runner-node tag.

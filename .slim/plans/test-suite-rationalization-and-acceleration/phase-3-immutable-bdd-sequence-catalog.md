# Phase 3: Immutable BDD Sequence Catalog

## Phase Acceptance Criteria

- [ ] Each selected normal BDD chunk has one suite Hub and an immutable catalog of approved packages.
- [ ] Catalog consumers start fresh scenario-owned instances.
- [ ] The provision manifest maps every Phase 1 upload caller to a catalog entry or a documented excluded/upload-under-test rationale.
- [ ] Upload-semantic and isolated scenario families retain independent setup.
- [ ] Scenario/retry cleanup cannot stop suite-Hub or catalog resources, demonstrated by two sequential catalog consumers and a forced retry.

## Owned Paths

- `bdd/step-definitions/e2e/host-steps.ts`
- `bdd/step-definitions/world.ts`
- `bdd/support/scenario-isolation.ts`
- `bdd/lib/scenario-isolation.ts`
- `bdd/lib/ownership.js`
- Catalog-eligible BDD step definitions and fixture metadata
- Focused catalog ownership/retry BDD regression feature and support code

## Tasks

- [ ] Define a static provision manifest and immutable suite-Hub lease/catalog API.
- [ ] Add a per-World ledger for instance, stream, and topic ownership.
- [ ] Migrate a conservative eligible fixture subset while retaining local instances.
- [ ] Record a manifest disposition for every Phase 1 upload caller.
- [ ] Add focused regression coverage that runs two catalog consumers sequentially and forces a retry, proving World-only disposal, new retry ledger, and suite-only catalog/Hub teardown.

## Verification Commands

- `npm run test:bdd-ci-node`
- `npm run test:bdd-ci-python`
- `npm run test:bdd-ci-api-node`
- `npm run check:runtime-invariants`
- Supported focused BDD command selecting the new catalog ownership/retry regression feature, including one forced retry.

## Non-goals

- No shared running instances or scenario parallelism.
- No migration of Hub/IaC, Manager/MultiManager, external-service, upload-semantic, or configuration-isolation scenarios.

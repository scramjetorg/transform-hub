# Implementation Plan: v2 Canonical Internal API

## Phase 1: Track Setup, Baseline Tests, and Reported Issue Locks

- [ ] Task: Conductor - create dedicated branch and PR review surface
    - [ ] Branch from the current branch unless the user chooses another base.
    - [ ] Create a PR describing the complete TO-BE state for v2 canonical internal API migration.
    - [ ] Record branch/PR details in the active track notes.
- [ ] Task: Read package codemaps and verify reusable shared contracts
    - [ ] Read package codemaps for `packages/rest-api2`, `packages/api-router`, `packages/api-client`, `packages/host`, `packages/manager`, `packages/runner-node`, `packages/runner`, `packages/cli`, and `bdd` if present.
    - [ ] Record shared package reuse decisions for `@scramjet/rest-api2`, `@scramjet/api-router`, `@scramjet/types`, and `@scramjet/symbols`.
- [ ] Task: Write failing tests for Host health/readiness issue #28
    - [ ] Add Host v1 route registration test for `GET /api/v1/health`.
    - [ ] Add Host v1 compatibility response test showing it delegates to or matches canonical v2 health behavior.
    - [ ] Confirm existing v1 `/load-check`, `/version`, `/config`, and `/status` expectations remain unchanged.
- [ ] Task: Implement Host health/readiness compatibility
    - [ ] Add `/api/v1/health` to the Host v1 compatibility router.
    - [ ] Reuse v2 health implementation where possible.
    - [ ] Run focused Host API tests.
- [ ] Task: Write failing tests for Manager aggregation metadata issue #29
    - [ ] Add `STHInfoRegister` tests proving `instanceName`, sequence identity/name, and hub/location metadata are preserved.
    - [ ] Add Manager v1 aggregation tests for `/instances` response metadata.
    - [ ] Add Manager v2 aggregation tests for equivalent metadata in v2 shape.
- [ ] Task: Implement Manager aggregation metadata
    - [ ] Preserve full instance metadata in Manager aggregation stores.
    - [ ] Expose explicit hub/location and sequence metadata without breaking existing v1 clients.
    - [ ] Update v2 schemas/contracts if needed.
    - [ ] Run focused Manager tests.
- [ ] Task: Write failing tests for unique runner Verser2 identity issue #26
    - [ ] Add config/host tests for deriving runner broker identity from the owning STH host identity when the unsafe default is present.
    - [ ] Add tests proving explicitly configured `verser2.runnerHost.localBroker.peerId` is preserved.
    - [ ] Add tests proving generated runner Host ID is stable and unique per STH identity.
- [ ] Task: Implement unique runner Verser2 identity derivation
    - [ ] Derive the default STH-local runner broker peer ID from host identity when safe.
    - [ ] Preserve explicit configuration and existing override paths.
    - [ ] Avoid persisted identity churn unless the current value is the unsafe default.
    - [ ] Run focused STH config and Host runner Verser2 config tests.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Track Setup, Baseline Tests, and Reported Issue Locks' (Protocol in workflow.md)

## Phase 2: Canonical v2 Internal Sequence and Runner Access

- [ ] Task: Write failing tests for sequence context v2 client accessors
    - [ ] Add runner-node app context tests for `this.hubClient()` and `this.spaceClient()` availability.
    - [ ] Assert the accessors are v2-backed and route through `@scramjet/rest-api2` client contracts.
    - [ ] Assert hub-level and space-level operations remain isolated.
    - [ ] Assert existing `this.hub` and `this.space` remain backwards compatible.
- [ ] Task: Implement sequence context `hubClient()` and `spaceClient()`
    - [ ] Add sequence-facing interfaces in a shared package when appropriate.
    - [ ] Back the new accessors with v2 fluent clients/transports.
    - [ ] Keep existing app context constructor compatibility.
    - [ ] Run focused runner-node tests.
- [ ] Task: Write failing tests for runner/host internal v2 routing
    - [ ] Capture current hardcoded runner internal `/api/v1` usage in tests or regression inventories.
    - [ ] Add tests for runner host API base selection using v2 for internal canonical access.
    - [ ] Add tests that legacy v1 sequence access still works through compatibility paths.
- [ ] Task: Migrate runner and host internal access to canonical v2
    - [ ] Replace internal runner-node/runner hardcoded v1 paths with v2-backed client access where feasible.
    - [ ] Keep v1 paths only where serving external legacy compatibility requires them.
    - [ ] Update host-to-space/CPM internal helpers to prefer v2 route contracts where safe.
    - [ ] Run focused runner and host tests.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Canonical v2 Internal Sequence and Runner Access' (Protocol in workflow.md)

## Phase 3: Legacy API Client as v2 Compatibility Facade

- [ ] Task: Write failing API client compatibility tests
    - [ ] Add tests proving existing HostClient method names and response shapes remain compatible.
    - [ ] Add tests proving ManagerClient, middleware client, and MultiManager client flows keep existing public behavior.
    - [ ] Add tests showing v1 client methods delegate through v2-backed internals where feasible.
- [ ] Task: Implement v2-backed compatibility facade
    - [ ] Introduce minimal adapters from v2 envelopes/lists into legacy v1 response shapes.
    - [ ] Migrate compatible HostClient topic, sequence, instance, and manager access methods first.
    - [ ] Migrate ManagerClient hub/space operations while preserving public constructors and defaults.
    - [ ] Keep true v1-only surfaces isolated and documented as compatibility exceptions.
- [ ] Task: Remove or quarantine internal hardcoded v1 callsites
    - [ ] Search runner, host, manager, multi-manager, CLI, and client packages for `/api/v1` literals.
    - [ ] Classify each as external compatibility, test fixture, documentation, or migration target.
    - [ ] Replace migration targets with v2 route contracts/client helpers.
    - [ ] Add regression tests preventing accidental new internal v1 dependencies where practical.
- [ ] Task: Run focused API client and package tests
    - [ ] Run affected package AVA tests through package runners.
    - [ ] Run narrow build checks for changed packages.
    - [ ] Record any skipped broader validation and rationale.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Legacy API Client as v2 Compatibility Facade' (Protocol in workflow.md)

## Phase 4: Manager Aggregation Readiness and BDD Coverage

- [ ] Task: Write failing readiness tests for issue #27
    - [ ] Add deterministic tests for three hubs where one registers later and aggregation eventually includes all expected sequence/instance state without arbitrary sleeps.
    - [ ] Add tests for any readiness summary/ack behavior introduced by the implementation.
    - [ ] Keep existing registration-order regression tests intact.
- [ ] Task: Implement Manager aggregation readiness contract
    - [ ] Track per-hub inventory consumption state for sequences and instances if needed.
    - [ ] Expose readiness through Manager health/status/details or another documented Manager-level signal.
    - [ ] Ensure MultiManager-proxied Manager routes expose the same readiness behavior.
- [ ] Task: Add BDD coverage for sequence and API-client migration behavior
    - [ ] Add BDD scenarios for sequence use of `hubClient()` and `spaceClient()`.
    - [ ] Add BDD scenarios showing legacy `this.hub` and `this.space` still work.
    - [ ] Add BDD scenarios for API client compatibility facade behavior.
    - [ ] Target roughly 90% coverage of affected sequence-side and API-client-side migration scenarios.
- [ ] Task: Run BDD/API validation
    - [ ] Run the narrowest relevant BDD smoke command(s), starting with API/node paths.
    - [ ] Run package tests for manager, host, runner-node, rest-api2, api-client, and touched clients.
    - [ ] Run package build or affected TypeScript build checks.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Manager Aggregation Readiness and BDD Coverage' (Protocol in workflow.md)

## Phase 5: Stream Compatibility, Final v1 Boundary Audit, and Release Readiness

- [ ] Task: Revalidate stream compatibility issues #23 and #24
    - [ ] Confirm streamed topic responses do not explicitly set forbidden `transfer-encoding` headers.
    - [ ] Confirm local Verser2 guest response `flushHeaders()` shim/regression remains covered.
    - [ ] Check upstream `signicode/verser2#46`; if still open, keep shim and document deferral.
- [ ] Task: Final internal v1 boundary audit
    - [ ] Search all affected packages for `/api/v1` usage.
    - [ ] Confirm remaining usages are external compatibility endpoints, legacy tests, docs, or intentionally isolated adapters.
    - [ ] Add or update notes documenting each intentional remaining internal-looking v1 usage.
- [ ] Task: Documentation and compatibility notes
    - [ ] Update API/client/sequence documentation for `hubClient()` and `spaceClient()`.
    - [ ] Document v1 as legacy external compatibility and v2 as canonical internal API.
    - [ ] Document Host/Manager/MultiManager health/readiness endpoints.
    - [ ] Document reported issue resolution/deferral status.
- [ ] Task: Final validation
    - [ ] Run focused package tests for all touched packages.
    - [ ] Run `npm run build:packages` if package boundaries or shared contracts changed.
    - [ ] Run relevant BDD smoke commands for API/node sequence behavior.
    - [ ] Run lint or narrow Biome validation for changed files.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Stream Compatibility, Final v1 Boundary Audit, and Release Readiness' (Protocol in workflow.md)

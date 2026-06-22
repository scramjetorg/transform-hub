# Implementation Plan: v2 Canonical Internal API

## Phase 1: Track Setup, Baseline Tests, and Reported Issue Locks

- [x] Task: Conductor - create dedicated branch and PR review surface
    - [x] Branch from the current branch unless the user chooses another base.
    - [x] Create a PR describing the complete TO-BE state for v2 canonical internal API migration.
    - [x] Record branch/PR details in the active track notes.
- [x] Task: Read package codemaps and verify reusable shared contracts
    - [x] Read package codemaps for `packages/rest-api2`, `packages/api-router`, `packages/api-client`, `packages/host`, `packages/manager`, `packages/runner-node`, `packages/runner`, `packages/cli`, and `bdd` if present.
    - [x] Record shared package reuse decisions for `@scramjet/rest-api2`, `@scramjet/api-router`, `@scramjet/types`, and `@scramjet/symbols`.
- [x] Task: Write failing tests for Host health/readiness issue #28
    - [x] Add Host v1 route registration test for `GET /api/v1/health`.
    - [x] Add Host v1 compatibility response test showing it delegates to or matches canonical v2 health behavior.
    - [x] Confirm existing v1 `/load-check`, `/version`, `/config`, and `/status` expectations remain unchanged.
- [x] Task: Implement Host health/readiness compatibility
    - [x] Add `/api/v1/health` to the Host v1 compatibility router.
    - [x] Reuse v2 health implementation where possible.
    - [x] Run focused Host API tests.
- [x] Task: Write failing tests for Manager aggregation metadata issue #29
    - [x] Add `STHInfoRegister` tests proving `instanceName`, sequence identity/name, and hub/location metadata are preserved.
    - [x] Add Manager v1 aggregation tests for `/instances` response metadata.
    - [x] Add Manager v2 aggregation tests for equivalent metadata in v2 shape.
- [x] Task: Implement Manager aggregation metadata
    - [x] Preserve full instance metadata in Manager aggregation stores.
    - [x] Expose explicit hub/location and sequence metadata without breaking existing v1 clients.
    - [x] Update v2 schemas/contracts if needed.
    - [x] Run focused Manager tests.
- [x] Task: Write failing tests for unique runner Verser2 identity issue #26
    - [x] Add config/host tests for deriving runner broker identity from the owning STH host identity when the unsafe default is present.
    - [x] Add tests proving explicitly configured `verser2.runnerHost.localBroker.peerId` is preserved.
    - [x] Add tests proving generated runner Host ID is stable and unique per STH identity.
- [x] Task: Implement unique runner Verser2 identity derivation
    - [x] Derive the default STH-local runner broker peer ID from host identity when safe.
    - [x] Preserve explicit configuration and existing override paths.
    - [x] Avoid persisted identity churn unless the current value is the unsafe default.
    - [x] Run focused STH config and Host runner Verser2 config tests.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Track Setup, Baseline Tests, and Reported Issue Locks' (Protocol in workflow.md)

## Phase 2: Canonical v2 Internal Sequence and Runner Access

- [x] Task: Write failing tests for sequence context v2 client accessors
    - [x] Add runner-node app context tests for `this.hubClient()` and `this.spaceClient()` availability.
    - [x] Assert the accessors are v2-backed and route through `@scramjet/rest-api2` client contracts.
    - [x] Assert hub-level and space-level operations remain isolated.
    - [x] Assert existing `this.hub` and `this.space` remain backwards compatible.
- [x] Task: Implement sequence context `hubClient()` and `spaceClient()`
    - [x] Add sequence-facing interfaces in a shared package when appropriate.
    - [x] Back the new accessors with v2 fluent clients/transports.
    - [x] Keep existing app context constructor compatibility.
    - [x] Run focused runner-node tests.
- [x] Task: Write failing tests for runner/host internal v2 routing
    - [x] Capture current hardcoded runner internal `/api/v1` usage in tests or regression inventories.
    - [x] Add tests for runner host API base selection using v2 for internal canonical access.
    - [x] Add tests that legacy v1 sequence access still works through compatibility paths.
- [x] Task: Migrate runner and host internal access to canonical v2
    - [x] Replace internal runner-node/runner hardcoded v1 paths with v2-backed client access where feasible.
    - [x] Keep v1 paths only where serving external legacy compatibility requires them.
    - [x] Update host-to-space/CPM internal helpers to prefer v2 route contracts where safe.
    - [x] Run focused runner and host tests.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Canonical v2 Internal Sequence and Runner Access' (Protocol in workflow.md)

## Phase 3: Legacy API Client as v2 Compatibility Facade

- [x] Task: Write failing API client compatibility tests
    - [x] Add tests proving existing HostClient method names and response shapes remain compatible.
    - [x] Add tests proving ManagerClient selected read methods keep existing public behavior.
    - [x] Add tests showing v1 client methods delegate through v2-backed internals where feasible.
- [x] Task: Implement v2-backed compatibility facade
    - [x] Introduce minimal adapters from v2 envelopes/lists into legacy v1 response shapes.
    - [x] Migrate compatible HostClient status/config methods first.
    - [x] Migrate selected ManagerClient read operations while preserving public constructors and defaults.
    - [x] Keep true v1-only surfaces isolated and documented as compatibility exceptions.
- [x] Task: Remove or quarantine internal hardcoded v1 callsites
    - [x] Search runner, host, manager, multi-manager, CLI, and client packages for `/api/v1` literals.
    - [x] Classify each as external compatibility, test fixture, documentation, or migration target.
    - [x] Replace migration targets with v2 route contracts/client helpers.
    - [x] Add regression tests preventing accidental new internal v1 dependencies where practical.
- [x] Task: Run focused API client and package tests
    - [x] Run affected package AVA tests through package runners.
    - [x] Run narrow build checks for changed packages.
    - [x] Record any skipped broader validation and rationale.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Legacy API Client as v2 Compatibility Facade' (Protocol in workflow.md)

## Phase 4: Manager Aggregation Readiness and BDD Coverage

- [x] Task: Write failing readiness tests for issue #27
    - [x] Add deterministic tests for three hubs where one registers later and aggregation eventually includes all expected sequence/instance state without arbitrary sleeps.
    - [x] Add tests for any readiness summary/ack behavior introduced by the implementation.
    - [x] Keep existing registration-order regression tests intact.
- [x] Task: Implement Manager aggregation readiness contract
    - [x] Track per-hub inventory consumption state for sequences and instances if needed.
    - [x] Expose readiness through Manager health/status/details or another documented Manager-level signal.
    - [x] Ensure MultiManager-proxied Manager routes expose the same readiness behavior.
- [x] Task: Add BDD coverage for sequence and API-client migration behavior
    - [x] Add BDD scenarios for sequence use of `hubClient()` and `spaceClient()`.
    - [x] Add BDD scenarios showing legacy `this.hub` and `this.space` still work.
    - [x] Add BDD scenarios for API client compatibility facade behavior.
    - [x] Target roughly 90% coverage of affected sequence-side and API-client-side migration scenarios.
- [x] Task: Run BDD/API validation
    - [x] Run the narrowest relevant BDD smoke command(s), starting with API/node paths.
    - [x] Run package tests for manager, host, runner-node, rest-api2, api-client, and touched clients.
    - [x] Run package build or affected TypeScript build checks.
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

## Active Track Notes

- Review branch: `conductor/v2-canonical-internal-api-20260621` (branched from `feat/manager-oss`).
- Pull request: https://github.com/0rail/transform-hub/pull/30
- User instruction: follow `conductor/workflow.md` for wrong tool calls and similar problems; run @oracle review before every manual validation except Phase 1.
- User instruction: codemaps may be updated if needed; avoid codemap churn unless missing/stale maps block implementation or materially improve handoff.
- Phase 1 codemap read: `packages/rest-api2/codemap.md`, `packages/api-router/codemap.md`, `packages/api-client/codemap.md`, `packages/host/codemap.md`, `packages/host/src/lib/codemap.md`, `packages/host/src/lib/api/codemap.md`, `packages/manager/codemap.md`, `packages/manager/src/lib/codemap.md`, `packages/manager/src/lib/api/codemap.md`, `packages/runner-node/codemap.md`, `packages/runner/codemap.md`, `bdd/codemap.md`, `packages/types/codemap.md`, and `packages/symbols/codemap.md`; `packages/cli/codemap.md` is absent.
- Shared reuse decisions: use `@scramjet/rest-api2` health DTOs/routes as canonical v2 shapes, `@scramjet/api-router` compatibility-router and route binding patterns, `@scramjet/types` existing v1/v2 config and Manager/Host contracts, and `@scramjet/symbols` protocol constants; no new shared abstraction is justified before Phase 1 tests reveal repeated behavior.
- Host health validation: initial package-runner match command (`npm test -- --match='*v1 compatibility health*'`) failed with the intended missing `/api/v1/health` assertion and unrelated preexisting AVA unhandled `WebAssembly is not defined` rejections from other Host tests under that runner profile; corrected narrow file invocation passed with `npx ava test/api-versioned-routing.spec.ts --match='*v1 compatibility health*' --require=ts-node/register`, and full `test/api-versioned-routing.spec.ts` passed (31 tests).
- Manager metadata validation: direct AVA invocation without repo runner profile failed with V8 CodeRange OOM, then a `NODE_OPTIONS=--jitless` direct retry misapplied AVA worker options; corrected to `node ../../scripts/run-ava.js <file>`. Focused metadata tests first exposed missing register metadata and v2 schema stripping, then passed. Full `test/sth-info-register.spec.ts` passed (28 tests) and `test/manager-api-v2-hotwire.spec.ts` passed (9 tests).
- Runner identity validation: focused `test/runner-verser2-host-config.spec.ts --match='*deriveSthRunnerVerser2HostIdentity*'` passed (3 tests); full `test/runner-verser2-host-config.spec.ts` passed (14 tests). Implementation only mutates the runner broker peer ID when it still equals the unsafe default `sth.default.runner.broker`; explicit peer IDs are preserved.
- Phase 1 integration validation: Host focused phase files passed (45 tests), Manager focused phase files passed (37 tests), and `@scramjet/rest-api2` package tests passed (33 tests). Broader package/build validation deferred to later phases because Phase 1 changed only focused route contracts, metadata enrichment, and runner identity derivation.
- Phase 1 lint/build validation: `npm run lint -- <changed files>` invokes Biome on `.` in this repo and reported preexisting out-of-scope `scripts/docs.js` warnings only; corrected direct changed-file `RAYON_NUM_THREADS=12 npx biome lint <changed files>` passed. `npm run build:packages` passed.
- Phase 1 deduplication check: reused `@scramjet/rest-api2` schemas/contracts for v2 metadata, `@scramjet/api-router` compatibility route patterns, existing Manager `STHInfoRegister`, and existing Host runner Verser2 config module. No repeated package-local helper needed beyond the Host-specific unsafe-default identity derivation helper.
- Phase 1 checkpoint commit: `033fb819` (`feat(conductor): Complete v2 canonical API phase 1`).
- Phase 1 manual verification: approved by user after PR push.
- Phase 2 sequence context validation: `test/app-context-parity.spec.ts` passed (10 tests) and `test/context-v2-client.spec.ts` passed (1 test). A first attempt to place the buildAppContext v2 assertion in `runtime-entry.spec.ts` passed the assertion but hit an unrelated preexisting `WebAssembly is not defined` unhandled rejection from the broader runtime-entry file under AVA match loading, so the coverage was moved to a context-only spec.
- Phase 2 runner/host routing inventory: runner-node now exposes `HostClient.getV2ApiBase()` and builds `hubClient()`/`spaceClient()` from `@scramjet/rest-api2` fluent clients over `/api/v2`; existing `getApiBase()` and `this.hub`/`this.space` remain v1 compatibility paths. Remaining runner-node `/api/v1` literals are legacy compatibility (`this.hub`, `this.space`). Legacy `packages/runner/src/runner.ts` still constructs v1 clients because it uses the legacy `RunnerAppContext`; replacing that surface is deferred until the legacy runner package is explicitly migrated. Host `/api/v1` literals are v1 compatibility routing, RPC compatibility, or CPM/storage compatibility paths and are not safe Phase 2 replacements without the Phase 3 client facade/Phase 4 readiness work.
- Phase 2 oracle review: initial review found `spaceClient()` incorrectly targeting Host hub v2 routes and constructor/deep-import compatibility risk. Fixed `spaceClient()` to route via Host CPM v2 proxy (`/api/v1/cpm/api/v2/...`) and added Host space middleware support for preserving requested Manager API version. User explicitly said to disregard constructor compatibility, so deep-import constructor compatibility is non-blocking.
- Phase 2 oracle re-review: no code correctness blockers; optional CPM version detection tightening was applied after review.
- Phase 2 validation: `test/app-context-parity.spec.ts` + `test/context-v2-client.spec.ts` passed (11 tests), `test/api-hotwire.spec.ts` passed with `-T 50000` (20 tests), direct changed-file Biome lint passed, and `npm run build:packages` passed. `test/host-client-channels.spec.ts` assertions passed but the file still emits the preexisting out-of-scope `WebAssembly is not defined` unhandled rejection under AVA.
- Phase 2 checkpoint commit: `3a50a0b3` (`feat(conductor): Complete v2 canonical API phase 2`).
- User instruction during Phase 2: disregard constructor/deep-import compatibility for the new sequence context v2 accessors; continue preserving public v1 API compatibility per track scope.
- Phase 2 feedback fix: replaced opaque `object` v2 accessor return types with generic/inferred `RunnerAppContext` client types and typed `buildAppContext()` as returning `@scramjet/rest-api2` `HubClient`/`SpaceClient`; focused context tests, direct lint, and `npm run build:packages` passed after the typing change.
- Phase 2 manual verification: approved by user after strong typing feedback fix.
- Phase 3 API client facade: added `packages/api-client/test/v2-facade.spec.ts` proving HostClient `getStatus()`/`getConfig()` and ManagerClient `getConfig()`/`getInstances()`/`getAllSequences()`/`getSequences()` preserve legacy method names and response shapes while using injectable v2-backed client utilities. `ManagerClient.getLoad()` remains a v1 compatibility exception because current Manager v2 load exposes only `{ load }`, not the legacy `LoadCheckStat` shape. Middleware and MultiManager client packages are adapter clients over Manager-like flows and remain unchanged until dedicated package tests reveal a facade need.
- Phase 3 v1 boundary audit: searched runner, runner-node, host, manager, multi-manager, sth, api-client, middleware-api-client, multi-manager-api-client, and CLI. Remaining `/api/v1` literals are classified as external compatibility endpoints, intentional compatibility defaults, legacy tests/fixtures, documentation, or the deliberate `/api/v1/cpm/api/v2` migration proxy. No additional safe replacement target was found in Phase 3 beyond the api-client v2 facade and runner-node v2 accessors already added.
- Phase 3 validation: `ulimit -v 1835008 && node ../../scripts/run-ava.js test/v2-facade.spec.ts test/pass.spec.ts` in `packages/api-client` passed (4 tests); direct changed-file `RAYON_NUM_THREADS=12 npx biome lint packages/api-client/src/host-client.ts packages/api-client/src/manager-client.ts packages/api-client/test/v2-facade.spec.ts packages/types/src/api-client/manager-client.ts conductor/tracks/v2_canonical_internal_api_20260621/plan.md` passed; `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm run build:packages` passed. Broader BDD and unrelated package suites are deferred to Phase 4/5 because Phase 3 touched the api-client facade, public API-client declarations, and plan notes only.
- Phase 3 oracle review: final re-review found no blockers and marked the phase safe to commit/push and proceed to manual validation. Non-blocking manual validation focus: direct HostClient, direct ManagerClient, ManagerClient via MultiManager proxy, and MiddlewareClient space proxy paths.
- Phase 3 checkpoint commit: `3b535d92` (`feat(conductor): Complete v2 canonical API phase 3`).
- Phase 3 manual verification: approved by user after PR push.
- Phase 4 readiness implementation: `STHInfoRegister` now stores instances by hub-qualified key so same instance IDs from different hubs are retained in Manager aggregation. `STHController` emits explicit bulk sequence/instance inventory markers and emits `disconnected` during the real disconnect path. Manager v2 health details now include an unpaginated `aggregation` readiness summary with total hubs, active hubs, sequence/instance counts, and per-hub inventory-consumed status. Empty active hubs are ready after both empty bulk inventory messages are consumed, disconnect clears inventory readiness, and health readiness no longer depends on storage middleware being configured. This readiness signal is visible through direct Manager v2 health and MultiManager Manager proxy routing because the proxied route delegates to Manager's v2 API.
- Phase 4 sequence/API-client coverage: added `AppContext.hubClient()` / `spaceClient()` declarations, legacy runner compatibility methods, sequence-test v2 client harness support and fixture coverage for `hubClient().status.get()` plus `spaceClient().hubs.get()`, and BDD IAC coverage for a running sequence using `hubClient()` against Host v2. Existing legacy `this.hub`/`this.space` tests remain in sequence-test and existing HUB-002/host-client BDD scenarios.
- Phase 4 validation: Manager readiness/API tests passed (`test/sth-info-register.spec.ts` + `test/manager-registration.spec.ts` + `test/manager-api-v2-hotwire.spec.ts`, 49 tests). Sequence-test fixture suite passed (10 tests), runner-node app context tests passed (11 tests), api-client facade tests passed (4 tests), rest-api2 package tests passed (33 tests), direct changed-file Biome lint passed, and `npm run build:packages` passed. Narrow BDD `NO_HOST=1 npm run test:bdd -- --name "HUB-002 TC-006"` passed (1 scenario, 9 steps). A first `npm run test:bdd-ci-node -- --name "HUB-002 TC-006"` selected 0 scenarios because that script filters to `@ci-instance-node`; generic BDD without `NO_HOST=1` failed from an existing harness mode conflict where BeforeAll starts a default host occupying the local runner Verser2 port before explicit host-start scenarios. `@scramjet/runner` package tests passed 110 assertions but still emitted the known preexisting `WebAssembly is not defined` unhandled rejection from `verser2-runner-transport.spec.ts` under the AVA `--jitless` profile. The 101-hub readiness regression emitted Node MaxListenersExceeded warnings from many test controllers piping to the shared manager logger; assertions passed and this is isolated to the synthetic high-fanout test.
- Phase 4 oracle review: final quick re-review found no blockers after the health scope consistency fix and marked Phase 4 safe to commit/push and proceed to manual validation.
- Phase 4 checkpoint commit: `25179523` (`feat(conductor): Complete v2 canonical API phase 4`).

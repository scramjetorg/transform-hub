# Implementation Plan: Remove Legacy Old-Verser Active Callsites

## Phase 1: Identification, Transient TDD Guardrails, and Config Targeting

- [x] Task: Create implementation branch, plan-start commit, and draft PR
    - [x] Create a dedicated implementation branch for this track before code changes.
    - [x] Commit the track handoff/plan-start state with a scoped Conductor commit message.
    - [x] Push the branch and open a draft PR for the old-verser/BPMux/socket removal track.
    - [x] Link the PR in the track notes before continuing implementation.
- [x] Task: Inventory old-verser, BPMux, and dead socket traces across active code, tests, config, package metadata, and docs
    - [x] Search active source and tests for `@scramjet/verser`, `@scramjet/bpmux`, `VerserConnection`, `VerserClient`, `new Verser`, `apiVerser`, `verserConnection`, `BPMux`, `SocketServer`, raw channel-index HostClients, `migrationMode`, `legacy`, and `dual`.
    - [x] Classify each trace as active runtime callsite, active config switch, active compatibility test, package dependency, standalone `packages/verser`/`packages/bpmux` package code/test, dead legacy socket branch, transient invariant/doc proof, or historical/archive.
    - [x] Explicitly preserve `packages/verser` and `packages/bpmux` source, package metadata, and package tests as standalone workspace packages that may still be used externally.
    - [x] Record the inventory in the track notes before implementation.
- [ ] Task: Add transient TDD guardrails for active old-verser/BPMux removal
    - [ ] Add or update focused tests proving active config no longer supports choosing `legacy` or `dual` transport behavior.
    - [ ] Add or update focused tests proving Host, Manager, and MultiManager active paths do not construct old-verser clients/servers or accept old-verser connection objects.
    - [x] Add temporary static/invariant checks or test assertions that identify active old-verser/BPMux callsites while excluding standalone `packages/verser`, standalone `packages/bpmux`, and approved historical/archive locations.
    - [ ] Keep these transient checks scoped so they can be removed in Phase 3 after normal code/tests enforce the final state.
- [x] Task: Plan exact config and API contract edits
    - [x] Identify all config schemas, descriptors, defaults, tests, and shared types that expose `migrationMode`, `legacy`, or `dual` selection.
    - [x] Identify any public interfaces that expose `VerserConnection`, old-verser concepts, or BPMux-backed active transport outside standalone packages.
    - [x] Identify legacy runner socket protocol paths that become dead once old-way branches are removed and mark their removal points for Phase 2.
    - [x] Decide the minimal replacement shape for each affected API: remove field, make verser2 unconditional, or replace with verser2 route/broker metadata.
- [ ] Task: Validate Phase 1 guardrails and commit Phase 1
    - [ ] Run focused tests for the transient guardrails and config target areas.
    - [ ] Run standalone `packages/verser` and `packages/bpmux` tests if touched by guardrail exclusions.
    - [ ] Run `NODE_OPTIONS="--max-old-space-size=1536" npm run check:runtime-invariants` if runtime invariant scripts changed.
    - [ ] Record validation results and any skipped validation in the track notes.
    - [ ] Commit the scoped Phase 1 changes.
- [ ] Task: Conductor - User Manual Verification 'Identification, Transient TDD Guardrails, and Config Targeting' (Protocol in workflow.md)

## Phase 2: Remove Active Old-Verser Runtime and Configuration Branches

- [x] Task: Remove old-way config selection and make verser2 unconditional
    - [x] Remove `migrationMode` from active verser2 config types, schemas, defaults, CLI descriptors, env descriptors, tests, and generated/public type surfaces.
    - [x] Remove `legacy` and `dual` branch handling from active config and runtime code.
    - [x] Simplify validation so required Manager/STH/MultiManager verser2 fields are validated as the only active connectivity configuration.
    - [x] Update config tests to prove old-way settings cannot activate or select old transport behavior.
- [x] Task: Remove Host/STH outbound old-verser callsites
    - [x] Remove `VerserClient` and `VerserClientConnection` imports/properties from `packages/host/src/lib/cpm-connector.ts`.
    - [x] Remove legacy constructor, connect, reconnect, header update, HTTP agent, and `cpmUrl`/`cpmSslCaPath` behavior that only exists for old-verser transport.
    - [x] Make Host Manager connectivity always construct and use verser2 Broker/Guest from validated config.
    - [x] Update/delete Host tests that stub `@scramjet/verser`; replace with tests for verser2-only forwarding and trust behavior.
    - [x] Remove active `@scramjet/verser` and `@scramjet/bpmux` dependencies from `packages/host/package.json` after imports are gone.
- [x] Task: Remove Manager old-verser controller and forwarding callsites
    - [x] Remove `VerserConnection` imports and active API parameters from Manager source.
    - [x] Remove or replace `Manager.handleHostConnection(id, verserConnection)` with verser2-only attach/registration behavior if still needed.
    - [x] Remove old local-peer forwarding fallback using `sth.verserConnection.getAgent()`.
    - [x] Refactor `STHController` to require verser2 broker/route metadata only and remove `verserConnection` storage, socket lifecycle hooks, header reads, and old `makeRequest` fallback.
    - [x] Remove `verserConnection` from `ISTHController`, connection store logic, auditor tests, and Manager tests.
    - [x] Remove active `@scramjet/verser` and `@scramjet/bpmux` dependencies from `packages/manager/package.json` and `packages/types/package.json` after imports are gone.
- [x] Task: Remove MultiManager old-verser server and legacy MultiHost callsites
    - [x] Remove `Verser` and `VerserConnection` imports and the `apiVerser` property from MultiManager.
    - [x] Remove legacy listener installation and handlers: `attachVerserListeners`, `attachHostAPI`, `attachMultiHostAPI`, and `handleSTHRequest`.
    - [x] Remove `/msth/:id` forwarding and active `MultiHostController`/store usage if no active code path remains.
    - [x] Delete or rewrite MultiManager tests that preserve legacy MultiHost or old-verser connection behavior.
    - [x] Remove active `@scramjet/verser` and `@scramjet/bpmux` dependencies from `packages/multi-manager/package.json` after imports are gone.
- [x] Task: Remove dead legacy runner socket protocol branches
    - [x] Remove or archive `SocketServer` only after confirming no active verser2 topology path uses it.
    - [x] Remove raw channel-index connection logic that exists only for legacy runner socket handoff.
    - [x] Remove legacy raw socket HostClients after Host, Manager, and MultiManager active paths no longer need them.
    - [x] Remove migration-only runner/socket config that only selected old-way behavior.
    - [x] Update or delete tests that preserve legacy runner socket behavior outside current verser2 topology requirements.
- [ ] Task: Validate Phase 2 and commit Phase 2
    - [ ] Run focused tests for `packages/config`, `packages/sth-config`, `packages/host`, `packages/manager`, `packages/multi-manager`, and `packages/types` as affected.
    - [ ] Run standalone `packages/verser` and `packages/bpmux` tests to confirm retained packages still work if dependency metadata or workspace wiring changed.
    - [ ] Run `NODE_OPTIONS="--max-old-space-size=1536" npm run build:packages`.
    - [ ] Run `NODE_OPTIONS="--max-old-space-size=1536" npm run check:runtime-invariants`.
    - [ ] Run relevant BDD smoke validation for Manager/STH connectivity, including `npm run test:bdd-ci-node` and `npm run test:bdd-ci-api-node` unless a skip is explicitly recorded with reason.
    - [ ] Record validation results and any skipped validation in the track notes.
    - [ ] Commit the scoped Phase 2 changes.
- [ ] Task: Conductor - User Manual Verification 'Remove Active Old-Verser Runtime and Configuration Branches' (Protocol in workflow.md)

## Phase 3: Remove Transient Guardrails and Clean Old Tests

- [ ] Task: Final inventory before cleanup
    - [ ] Search the full repository for old-verser/BPMux/socket identifiers, old config flags, active test names, docs, invariant allowlists, and package dependencies.
    - [ ] Confirm remaining old-verser/BPMux traces are limited to `packages/verser`, `packages/bpmux`, their tests/package metadata, and explicitly historical/archive locations.
    - [ ] Confirm no active Host/Manager/MultiManager/types/config package imports or depends on `@scramjet/verser` or `@scramjet/bpmux`.
- [ ] Task: Remove transient old-verser/BPMux-removal scaffolding
    - [ ] Remove temporary static/invariant checks, doc tests, or allowlist entries that were added only to drive removal.
    - [ ] Keep durable topology/dependency checks that protect the final architecture without preserving old-verser compatibility wording.
    - [ ] Ensure final tests do not assert old-verser compatibility or old transport selection behavior outside standalone `packages/verser` and `packages/bpmux` package tests.
- [ ] Task: Clean active test suites and documentation
    - [ ] Delete or rewrite compatibility-only old-verser/BPMux tests from Host, Manager, MultiManager, config, and shared types normal test suites.
    - [ ] Preserve tests proving standalone `packages/verser` and `packages/bpmux` still build/export as standalone packages.
    - [ ] Remove active tests that preserve deleted legacy runner socket behavior outside current verser2 topology requirements.
- [ ] Task: Validate cleanup and commit Phase 3
    - [ ] Run repository-wide static searches proving no active old-verser/BPMux/socket traces remain outside `packages/verser`, `packages/bpmux`, and historical/archive locations.
    - [ ] Run focused tests affected by cleanup, including standalone `packages/verser` and `packages/bpmux` package tests.
    - [ ] Run `NODE_OPTIONS="--max-old-space-size=1536" npm run check:runtime-invariants`.
    - [ ] Run `NODE_OPTIONS="--max-old-space-size=1536" npm run build:packages`.
    - [ ] Commit the scoped Phase 3 changes.
- [ ] Task: Conductor - User Manual Verification 'Remove Transient Guardrails and Clean Old Tests' (Protocol in workflow.md)

## Phase 4: Dependency Audit, Final Reviews, Documentation, and Verification

- [ ] Task: Confirm final verser2 and standalone legacy package dependencies
    - [ ] Ensure affected TypeScript packages depend on the needed public `@signicode/verser2-host`, `@signicode/verser2-guest-node`, `@signicode/verser2-guest-bun`, `@signicode/verser-common`, and `@signicode/verser2-guest-js-common` packages.
    - [ ] Ensure Python runtime packaging includes `verser2-guest-python` and documents required TLS/trust inputs.
    - [ ] Ensure active packages do not reference unpublished or internal verser2 APIs when public Host/Guest/Broker APIs exist.
    - [ ] Confirm `packages/verser` and `packages/bpmux` remain standalone buildable workspaces and are the only allowed old-verser/BPMux dependency owners.
- [ ] Task: Complete final automated reviews
    - [ ] Complete dependency removal review for old-verser/BPMux active dependencies and final verser2 dependencies.
    - [ ] Complete dead-code review for deleted old-way branches, deleted socket paths, and remaining standalone legacy packages.
    - [ ] Complete security review for TLS/CA/cert handling, mTLS registration authorization, private-key permissions, and per-runner cert cleanup.
    - [ ] Complete final architecture conformance review for flat topology, exact-match routes, lease lifecycle, no direct runner-to-Manager connectivity, and no unsupported protocol assumptions.
- [ ] Task: Update final documentation and Conductor artifacts
    - [ ] Update active docs to describe verser2-only Manager/STH connectivity and remove guidance for selecting `legacy`, `dual`, old-verser, or BPMux-backed mode.
    - [ ] Update package guidance for final verser2 connectivity architecture and standalone old-verser/BPMux package status.
    - [ ] Update the verser2 rollout notes to mark old-verser/BPMux/socket cleanup items as superseded by or completed through this track.
- [ ] Task: Run final full validation
    - [ ] Run `NODE_OPTIONS="--max-old-space-size=1536" npm run check:runtime-invariants`.
    - [ ] Run `NODE_OPTIONS="--max-old-space-size=1536" npm run build:packages`.
    - [ ] Run `NODE_OPTIONS="--max-old-space-size=1536" npm run test:packages-no-concurrent`.
    - [ ] Run relevant BDD smoke validation for Manager/STH connectivity, including `npm run test:bdd-ci-node` and `npm run test:bdd-ci-api-node`.
    - [ ] Run current-contract Python BDD coverage if new Python refapps/scenarios are available, otherwise record the skip reason.
    - [ ] Run Bun BDD or smoke validation if available, otherwise record the skip reason.
    - [ ] Record any skipped broad Docker/Kubernetes validation with exact reason.
- [ ] Task: Final absence review and commit Phase 4
    - [ ] Run repository-wide static searches proving no active old-verser/BPMux/socket traces remain outside `packages/verser`, `packages/bpmux`, and historical/archive locations.
    - [ ] Confirm no active package manifest outside standalone legacy packages depends on `@scramjet/verser` or `@scramjet/bpmux`.
    - [ ] Confirm final tests/invariants do not preserve old-verser/BPMux/socket compatibility or temporary removal-only scaffolding.
    - [ ] Commit the scoped Phase 4 changes.
- [ ] Task: Conductor - User Manual Verification 'Dependency Audit, Final Reviews, Documentation, and Verification' (Protocol in workflow.md)

## Track Notes

- Draft PR: https://github.com/0rail/transform-hub/pull/11

### Phase 1 Inventory

- Preserved standalone legacy packages: `packages/verser/**` and `packages/bpmux/**`, including their source, tests, package metadata, and `@scramjet/bpmux` dependency from `packages/verser/package.json`.
- Active package dependencies to remove after imports are gone: `packages/host/package.json`, `packages/manager/package.json`, `packages/multi-manager/package.json`, and `packages/types/package.json` depend on `@scramjet/verser`.
- Active Host old-verser runtime path: `packages/host/src/lib/cpm-connector.ts` imports `VerserClient`/`VerserClientConnection`, constructs `new VerserClient(...)` when `usesVerser2` is false, updates old-verser headers, uses old `cpmUrl`/`cpmSslCaPath` CA behavior, falls back to `verserClient.verserAgent`, and branches `connect()`/`makeHttpRequestToCpm()` on `migrationMode`.
- Active Manager old-verser runtime path: `packages/manager/src/lib/manager.ts` imports `VerserConnection`, accepts old connections through `handleHostConnection(id, verserConnection)`, constructs `STHController` with a `VerserConnection`, and falls back to `sth.verserConnection.getAgent()` when not in strict verser2 mode.
- Active Manager STH controller old-verser path: `packages/manager/src/lib/sth-controller.ts` imports/stores `VerserConnection`, reads old headers, reconnects legacy sockets, builds `HostClient` with `ClientUtilsCustomAgent`, opens `/platform` and `/log` using `makeRequest`, hooks socket lifecycle, and falls back to legacy `makeRequest` when no verser2 options exist.
- Active shared type exposure: `packages/types/src/manager/sth-connection-store.ts` imports `VerserConnection`, exposes `verserConnection?: VerserConnection`, and types `reconnect(verserConnection?: VerserConnection)`.
- Active MultiManager old-verser path: `packages/multi-manager/src/lib/multi-manager.ts` imports `Verser`/`VerserConnection`, owns `apiVerser`, conditionally constructs `new Verser(...)`, installs `attachVerserListeners`, delegates old Host connections to `Manager.handleHostConnection`, keeps `/msth/:id` forwarding, and gates old-vs-verser2 behavior through `migrationMode`.
- Active legacy MultiHost path: `packages/multi-manager/src/lib/multi-host-controller.ts` and `multi-host-controller-store.ts` remain old `VerserConnection`-based and are only used by the legacy MultiHost branch.
- Active config switch surfaces: `packages/config/src/verser2-config.ts`, `packages/types/src/verser2-transport-configuration.ts`, `packages/types/src/sth-command-options.ts`, `packages/multi-manager/src/types/multi-manager-types.ts`, `packages/sth-config/src/default-config.ts`, `packages/multi-manager/src/config/multi-manager-configuration.ts`, and `packages/multi-manager/src/lib/default-config.ts` expose or default `migrationMode`, `legacy`, and `dual` selection.
- Active compatibility tests to rewrite/delete: `packages/config/test/index.spec.ts`, `packages/sth-config/test/*`, `packages/multi-manager/test/config/multi-manager-configuration.spec.ts`, `packages/host/test/cpm-connector.test.ts`, `packages/manager/test/manager-forwarding.spec.ts`, `packages/manager/test/manager-connection.spec.ts`, `packages/manager/test/sth-controller.spec.ts`, `packages/manager/test/sth-connection-store.spec.ts`, `packages/manager/test/manager-auditor.spec.ts`, `packages/multi-manager/test/lib/multi-manager-verser2.spec.ts`, `packages/multi-manager/test/lib/multi-host-controller*.spec.ts`, and related tests that assert old `verserConnection` compatibility.
- Dead runner/socket candidates after old-way removal: `packages/runner/src/transport/runner-transport-config.ts` still accepts `{ kind: "legacy" }`, `packages/runner/src/bin/start-runner.ts` still starts raw `HostClient` for legacy mode, `packages/types/src/runner-transport.ts` includes `legacy`, `packages/sequence-test/src/runner-launcher.ts` injects legacy config, and `packages/host/src/lib/socket-server.ts`/`start-host.ts` plus raw channel-index HostClients remain candidates for removal after confirming no current verser2 topology depends on them.
- Historical/archive/docs/non-target references: package codemaps, Conductor notes, README license text using “dual”, generated/report/vendor content under runner-python `__pypackages__`, and parity fixture prose are not active old-verser runtime callsites for this track phase.
- Transient guardrail: `scripts/check-runtime-wrapper-invariants.sh` Guard 9 now searches active package files for old-verser/BPMux imports, `VerserConnection`/`VerserClient`/`apiVerser`/`verserConnection`, `migrationMode`/`verser2MigrationMode` selection, legacy runner config, and `SocketServer`, excluding standalone `packages/verser`, `packages/bpmux`, codemaps, Markdown, node_modules, dist, and runner-python vendored packages. It intentionally fails before removal and is scheduled for Phase 3 cleanup.
- Guardrail validation: `bash -n scripts/check-runtime-wrapper-invariants.sh` passed. `if NODE_OPTIONS="--max-old-space-size=1536" npm run check:runtime-invariants; then exit 1; else exit 0; fi` passed by confirming Guard 9 currently fails on the recorded active inventory.

### Phase 1 Config/API Edit Targets

- Remove `migrationMode` and `Verser2MigrationMode` from `packages/types/src/verser2-transport-configuration.ts`, `packages/types/src/sth-command-options.ts`, `packages/multi-manager/src/types/multi-manager-types.ts`, `packages/config/src/verser2-config.ts`, STH defaults, Manager defaults, MultiManager defaults/config loader, and related tests. Keep `enabled` only if it still represents startup enabling rather than old transport selection.
- Replace runtime `usesVerser2`/`usesVerser2OnlyTransport`/`usesLegacyVerserTransport` conditionals with unconditional verser2 startup and forwarding in Host, Manager, and MultiManager.
- Change `ISTHController` so it no longer exposes `verserConnection` or `reconnect(verserConnection)`. Keep verser2 broker/route metadata and health/lifecycle methods only.
- Change `STHController` constructor to require verser2 options and derive access key, tags, description, request forwarding, audit/log/platform streams, and connection health from verser2 broker/route metadata only.
- Remove `Manager.handleHostConnection(id, verserConnection)` after MultiManager no longer accepts old Verser Host connections; Manager STH attachment should happen through verser2 local Broker/Guest setup and route readiness.
- Remove MultiManager `apiVerser`, `attachVerserListeners`, `attachHostAPI`, `attachMultiHostAPI`, `handleSTHRequest`, `/msth/:id`, `MultiHostController`, and `MultiHostControllerStore` active usage if no verser2 path references them.
- Remove legacy runner transport shape `{ kind: "legacy" }`, raw `HostClient` branch in `packages/runner/src/bin/start-runner.ts`, adapter fallback to legacy runner env, and raw `SocketServer`/channel-index host path once verser2 runner Host is confirmed to cover active topology.

### Phase 2 Validation Notes

- `NODE_OPTIONS="--max-old-space-size=1536" npm run build:packages` passed after removing the old Host `SocketServer` export and Host `LegacyRunnerTransport` leftovers.
- `NODE_OPTIONS="--max-old-space-size=1536" npm run check:runtime-invariants` passed; Guard 9 now reports no active old-verser/BPMux/migration/socket traces outside standalone legacy packages.
- Focused tests passed: `@scramjet/config`, `@scramjet/sth-config`, `@scramjet/adapters-common`, `@scramjet/runner`, `@scramjet/manager`, `@scramjet/multi-manager`, `@scramjet/adapter-process`, `@scramjet/types`, and `@scramjet/host` with `-T 60000`.
- Host test note: initial full Host run with the default timeout/OOMed while stale `LegacyRunnerTransport` tests still imported a deleted class. After deleting those compatibility assertions, isolated `test/runner-transport.spec.ts -T 60000` and full Host `-T 60000` both passed under `NODE_OPTIONS="--max-old-space-size=1536"`.

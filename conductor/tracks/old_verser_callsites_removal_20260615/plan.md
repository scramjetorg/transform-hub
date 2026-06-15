# Implementation Plan: Remove Legacy Old-Verser Active Callsites

## Phase 1: Identification, Transient TDD Guardrails, and Config Targeting

- [ ] Task: Inventory old-verser, BPMux, and dead socket traces across active code, tests, config, package metadata, and docs
    - [ ] Search active source and tests for `@scramjet/verser`, `@scramjet/bpmux`, `VerserConnection`, `VerserClient`, `new Verser`, `apiVerser`, `verserConnection`, `BPMux`, `SocketServer`, raw channel-index HostClients, `migrationMode`, `legacy`, and `dual`.
    - [ ] Classify each trace as active runtime callsite, active config switch, active compatibility test, package dependency, standalone `packages/verser`/`packages/bpmux` package code/test, dead legacy socket branch, transient invariant/doc proof, or historical/archive.
    - [ ] Explicitly preserve `packages/verser` and `packages/bpmux` source, package metadata, and package tests as standalone workspace packages that may still be used externally.
    - [ ] Record the inventory in the track notes before implementation.
- [ ] Task: Add transient TDD guardrails for active old-verser/BPMux removal
    - [ ] Add or update focused tests proving active config no longer supports choosing `legacy` or `dual` transport behavior.
    - [ ] Add or update focused tests proving Host, Manager, and MultiManager active paths do not construct old-verser clients/servers or accept old-verser connection objects.
    - [ ] Add temporary static/invariant checks or test assertions that identify active old-verser/BPMux callsites while excluding standalone `packages/verser`, standalone `packages/bpmux`, and approved historical/archive locations.
    - [ ] Keep these transient checks scoped so they can be removed in Phase 3 after normal code/tests enforce the final state.
- [ ] Task: Plan exact config and API contract edits
    - [ ] Identify all config schemas, descriptors, defaults, tests, and shared types that expose `migrationMode`, `legacy`, or `dual` selection.
    - [ ] Identify any public interfaces that expose `VerserConnection`, old-verser concepts, or BPMux-backed active transport outside standalone packages.
    - [ ] Identify legacy runner socket protocol paths that become dead once old-way branches are removed and mark their removal points for Phase 2.
    - [ ] Decide the minimal replacement shape for each affected API: remove field, make verser2 unconditional, or replace with verser2 route/broker metadata.
- [ ] Task: Validate Phase 1 guardrails and commit Phase 1
    - [ ] Run focused tests for the transient guardrails and config target areas.
    - [ ] Run standalone `packages/verser` and `packages/bpmux` tests if touched by guardrail exclusions.
    - [ ] Run `NODE_OPTIONS="--max-old-space-size=1536" npm run check:runtime-invariants` if runtime invariant scripts changed.
    - [ ] Record validation results and any skipped validation in the track notes.
    - [ ] Commit the scoped Phase 1 changes.
- [ ] Task: Conductor - User Manual Verification 'Identification, Transient TDD Guardrails, and Config Targeting' (Protocol in workflow.md)

## Phase 2: Remove Active Old-Verser Runtime and Configuration Branches

- [ ] Task: Remove old-way config selection and make verser2 unconditional
    - [ ] Remove `migrationMode` from active verser2 config types, schemas, defaults, CLI descriptors, env descriptors, tests, and generated/public type surfaces.
    - [ ] Remove `legacy` and `dual` branch handling from active config and runtime code.
    - [ ] Simplify validation so required Manager/STH/MultiManager verser2 fields are validated as the only active connectivity configuration.
    - [ ] Update config tests to prove old-way settings cannot activate or select old transport behavior.
- [ ] Task: Remove Host/STH outbound old-verser callsites
    - [ ] Remove `VerserClient` and `VerserClientConnection` imports/properties from `packages/host/src/lib/cpm-connector.ts`.
    - [ ] Remove legacy constructor, connect, reconnect, header update, HTTP agent, and `cpmUrl`/`cpmSslCaPath` behavior that only exists for old-verser transport.
    - [ ] Make Host Manager connectivity always construct and use verser2 Broker/Guest from validated config.
    - [ ] Update/delete Host tests that stub `@scramjet/verser`; replace with tests for verser2-only forwarding and trust behavior.
    - [ ] Remove active `@scramjet/verser` and `@scramjet/bpmux` dependencies from `packages/host/package.json` after imports are gone.
- [ ] Task: Remove Manager old-verser controller and forwarding callsites
    - [ ] Remove `VerserConnection` imports and active API parameters from Manager source.
    - [ ] Remove or replace `Manager.handleHostConnection(id, verserConnection)` with verser2-only attach/registration behavior if still needed.
    - [ ] Remove old local-peer forwarding fallback using `sth.verserConnection.getAgent()`.
    - [ ] Refactor `STHController` to require verser2 broker/route metadata only and remove `verserConnection` storage, socket lifecycle hooks, header reads, and old `makeRequest` fallback.
    - [ ] Remove `verserConnection` from `ISTHController`, connection store logic, auditor tests, and Manager tests.
    - [ ] Remove active `@scramjet/verser` and `@scramjet/bpmux` dependencies from `packages/manager/package.json` and `packages/types/package.json` after imports are gone.
- [ ] Task: Remove MultiManager old-verser server and legacy MultiHost callsites
    - [ ] Remove `Verser` and `VerserConnection` imports and the `apiVerser` property from MultiManager.
    - [ ] Remove legacy listener installation and handlers: `attachVerserListeners`, `attachHostAPI`, `attachMultiHostAPI`, and `handleSTHRequest`.
    - [ ] Remove `/msth/:id` forwarding and active `MultiHostController`/store usage if no active code path remains.
    - [ ] Delete or rewrite MultiManager tests that preserve legacy MultiHost or old-verser connection behavior.
    - [ ] Remove active `@scramjet/verser` and `@scramjet/bpmux` dependencies from `packages/multi-manager/package.json` after imports are gone.
- [ ] Task: Remove dead legacy runner socket protocol branches
    - [ ] Remove or archive `SocketServer` only after confirming no active verser2 topology path uses it.
    - [ ] Remove raw channel-index connection logic that exists only for legacy runner socket handoff.
    - [ ] Remove legacy raw socket HostClients after Host, Manager, and MultiManager active paths no longer need them.
    - [ ] Remove migration-only runner/socket config that only selected old-way behavior.
    - [ ] Update or delete tests that preserve legacy runner socket behavior outside current verser2 topology requirements.
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

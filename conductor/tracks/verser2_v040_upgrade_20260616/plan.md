# Plan: verser2 v0.4.0 Native Redirects and Upstream Tunnels

## Phase 1: v0.4.0 API Discovery and Compatibility Baseline

- [x] Task: Confirm v0.4.0 package availability and API changes
    - [x] Read relevant package codemaps before implementation: Manager, MultiManager, Host, API server, config, types, runner, runner-node, runner-python, and runner-bun.
    - [x] Verify `@signicode/verser2-*` v0.4.0 packages resolve through the existing authenticated package workflow.
    - [x] Inspect upstream v0.4.0 public APIs for native 308 redirects, redirect-follow behavior, and upstream host tunneling.
    - [x] Compare v0.4.0 APIs against current v0.3.1 integration surfaces and record breaking changes.
    - [x] If a v0.4.0 capability is missing or incompatible with the intended architecture, halt the implementation subtask and produce an upstream-verser2 report before adding local workarounds.
        - Discovery recorded in `phase1-api-discovery.md`. v0.4.0 package availability is confirmed via authenticated GitHub Packages. Native 307/308 Broker redirect following is available. Upstream Host federation is available through `host.connectUpstream()`. Generic CONNECT tunneling remains unsupported by the public Host/Guest API and should not be treated as available without a later upstream report or API proof.
- [x] Task: Upgrade verser2 dependencies
    - [x] Update active workspace dependencies from v0.3.1 to v0.4.0 for `@signicode/verser-common`, `@signicode/verser2-host`, `@signicode/verser2-guest-node`, `@signicode/verser2-guest-bun`, and `@signicode/verser2-guest-python` where present.
    - [x] Update `package-lock.json` using npm.
    - [x] Preserve package manager guidance: use npm, not yarn.
    - [x] Update any package-resolution helper or version guard that assumes v0.3.1.
        - Updated active workspace manifests and `package-lock.json` to `0.4.0`. Updated the runner-python release wheel version and SHA-256 to `verser2_guest_python-0.4.0-py3-none-any.whl` / `3f903f6f6e3d8b87a0ec88205f1843035843cae6a2cb8b6e16681cff93955644`. Validation: `npm install --userconfig <temporary GitHub Packages npmrc>` passed and `npm run check:verser2-packages` passed.
- [x] Task: Establish compatibility tests before behavior changes
    - [x] Run or update focused tests proving existing Manager/STH route classification still behaves as documented.
    - [x] Run or update focused tests proving runner/runtime verser2 transport boot config still parses and starts with v0.4.0.
    - [x] Run or update focused tests for MultiManager Host setup and route registration.
    - [x] Run the narrowest build/typecheck for packages affected by dependency/API changes.
        - Validation passed: `NODE_OPTIONS="--max-old-space-size=1536" npm run build:packages`; Manager `test/route-classifier.spec.ts` and `test/verser2-transport.spec.ts`; MultiManager `test/lib/verser2-host-config.spec.ts`; Host `test/runner-transport.spec.ts`; Runner `test/transport/runner-transport-config.spec.ts` and `test/transport/verser2-runner-transport.spec.ts`; runner-node `test/host-client-channels.spec.ts`; runner-python `tests/test_boot_config.py` and `tests/test_verser2_runtime.py`; runner-bun `npm test`; and `npm run check:runtime-invariants`.
- [x] Task: Conductor - User Manual Verification 'v0.4.0 API Discovery and Compatibility Baseline' (Protocol in workflow.md)
    - [x] User approved Phase 1 completion after review PR creation: https://github.com/0rail/transform-hub/pull/12

## Phase 2: Native 308 Redirect Adoption

- [x] Task: Define the native redirect contract
    - [x] Update the route-forwarding design notes to replace `signicode/verser2#20` pending assumptions with the actual v0.4.0 redirect behavior.
    - [x] Define how Manager follow-classified routes produce native 308-style redirect responses or verser2-followable metadata.
    - [x] Define when `direct-route-metadata` remains necessary for STH-originated STH-to-STH payloads.
    - [x] Define fallback/error behavior when a route is unavailable, not follow-safe, or not representable as a native redirect.
        - Contract recorded in `native-redirect-contract.md`. Manager follow decisions should emit `308` responses with verser2 route `Location` targets for external/API callers. Existing direct route metadata remains for STH-originated payloads. Manager-owned, multiplex, and unsupported-bidirectional routes do not redirect. v0.4.0 upstream Host federation is separate from generic CONNECT tunneling, which remains unsupported by public Host/Guest APIs.
- [x] Task: Update Manager follow routing implementation
    - [x] Update `packages/manager/src/lib/route-classifier.ts` and related types only as needed to represent native redirect decisions.
    - [x] Replace Manager dummy/internal follow dispatch in `packages/manager/src/lib/manager.ts` with native 308-style redirect behavior for follow-safe Manager API requests.
    - [x] Preserve Manager-owned and Manager-multiplex routes on existing Manager handlers.
    - [x] Preserve the direct STH-to-STH data-plane constraint: Manager coordinates route ownership but does not proxy STH-originated payloads.
        - `prepareManagerFollowForwarding()` now returns native redirect decisions for external/API callers. Manager follow handling writes `308` responses with verser2 route `Location` and diagnostic route headers. Direct STH-originated payloads still receive route metadata.
- [x] Task: Update redirect tests
    - [x] Update `packages/manager/test/route-classifier.spec.ts` for native redirect decisions and retained metadata cases.
    - [x] Add Manager tests covering follow-safe reads, state-changing single-owner follow routes, route-unavailable redirects, and non-follow Manager-owned routes.
    - [x] Update or remove tests that specifically assert dummy internal dispatch where native redirect is now expected.
        - Updated classifier/follow-forwarding coverage to assert native redirect targets for follow-safe state-changing routes and retained direct route metadata for CPM/STH-originated calls. Existing classification tests continue to cover Manager-owned, Manager-multiplex, and unsupported-bidirectional decisions.
- [x] Task: Add isolated verser2-only redirect BDD gate
    - [x] Add BDD wording for native 308 redirect-following that uses only verser2 Host/Broker/local Guests and does not start Hub, Manager, STH, runners, Docker, or Kubernetes.
    - [x] Add planned BDD wording for the future Phase 3 sequence-to-space tunnel path, marked ignored until that behavior is implemented.
    - [x] Add a dedicated `npm run test:bdd-ci-verser2` gate that sets `NO_HOST=true` and selects only `@ci-verser2` scenarios.
        - Added `bdd/features/verser2/VERSER2-001-isolated-routing.feature` and `bdd/step-definitions/verser2/isolated-routing.ts`. The active scenario proves a remote verser2 Broker follows a native `308` from `manager.local.test` to the advertised `space.local.test` route while preserving path/query. The ignored Phase 3 scenario records the expected sequence-to-space tunneled request behavior.
- [x] Task: Validate native redirect adoption
    - [x] Run focused Manager route-classifier and Manager routing tests.
    - [x] Run affected Manager build/typecheck.
    - [x] Record any retained dummy/internal forwarding and the reason it remains.
        - Validation passed: `NODE_OPTIONS="--max-old-space-size=1536" npm test -- test/route-classifier.spec.ts`; `NODE_OPTIONS="--max-old-space-size=1536" npm test -- test/route-classifier.spec.ts test/verser2-transport.spec.ts`; and `NODE_OPTIONS="--max-old-space-size=1536" npm run build` in `packages/manager`. No dummy/internal follow dispatch is retained for external/API follow decisions.
        - Additional isolated BDD gate validation passed: `NODE_OPTIONS="--max-old-space-size=1536" npm --prefix bdd run build:bdd`; `NODE_OPTIONS="--max-old-space-size=1536" npm run test:bdd-ci-verser2`. The first direct scenario run without `NO_HOST=true` started the default BDD hub; this was classified as command invocation mismatch, corrected by adding/running the dedicated no-hub gate, and is not a product failure.
- [ ] Task: Conductor - User Manual Verification 'Native 308 Redirect Adoption' (Protocol in workflow.md)

## Phase 3: Upstream Host Tunneling Integration

- [ ] Task: Define tunnel-enabled communication paths
    - [ ] Identify local forwarding paths in `packages/api-server/src/handlers/routed-forward.ts`, `packages/api-server/src/handlers/forward.ts`, Host RPC forwarding, Manager/STH request forwarding, runner transport, and MultiManager routing.
    - [ ] Classify each path as tunneled sequence-to-space request candidate, redirect-only, Manager-owned/multiplexed, or retained fallback.
    - [ ] Define how sequence/runtime Broker/fetch requests reach Space/STH/Manager endpoints over the owning STH hub-level verser2 Host, Manager upstream Host federation, and native 308 redirect-following to other Hosts/STHs.
    - [ ] Document generic CONNECT, `/platform`, `/inout`, and other paths deliberately left unsupported or deferred.
- [ ] Task: Add tunnel configuration and types
    - [ ] Update `packages/types/src/verser2-transport-configuration.ts` for any v0.4.0 tunnel/redirect policy options used by Transform Hub.
    - [ ] Update `packages/config/src/verser2-config.ts` schemas and validation for upstream host tunnel settings.
    - [ ] Update STH/Manager/MultiManager defaults and public-safe masking if new settings are added.
    - [ ] Add or update CLI descriptors only when a setting must be user-configurable rather than internal.
- [ ] Task: Implement tunnel usage incrementally
    - [ ] Wire v0.4.0 upstream tunneling in the selected Manager/STH communication path while retaining fallback until validation passes.
    - [ ] Wire tunnel behavior into API-server or Host forwarding seams only where native tunnel parity is clear.
    - [ ] Update runner/runtime transport integration only if v0.4.0 tunnel APIs affect existing runner Guest/Broker communication.
    - [ ] Ensure streaming and backpressure remain stream-based and do not require full response buffering.
- [ ] Task: Update tunnel tests
    - [ ] Add or update API-server forwarding/tunnel tests for request body streaming, response body streaming, abort/cancellation, route unavailable, and binary payloads.
    - [ ] Add or update Manager/Host transport tests for tunnel-enabled paths.
    - [ ] Add or update runner/runtime tests only for changed tunnel-related boot config or transport behavior.
    - [ ] Add config tests for any new tunnel or redirect options.
- [ ] Task: Validate tunnel integration
    - [ ] Run focused API-server, Manager, Host, config/types, and affected runner/runtime tests.
    - [ ] Run affected package builds/typechecks.
    - [ ] Record tunnel candidates that remain on fallback local forwarding with rationale.
- [ ] Task: Conductor - User Manual Verification 'Upstream Host Tunneling Integration' (Protocol in workflow.md)

## Phase 4: Cross-Flow Integration and Full Validation

- [ ] Task: Validate Manager-to-STH communication
    - [ ] Test native redirect behavior for Manager API callers targeting a single STH.
    - [ ] Test tunnel-enabled request/stream paths selected in Phase 3.
    - [ ] Test route unavailable, route retraction, reconnect, and duplicate route/peer behavior remains clear.
- [ ] Task: Validate STH-to-STH communication
    - [ ] Test route metadata or native redirect flow used for direct STH-to-STH payloads.
    - [ ] Verify Manager does not become a data-plane proxy for STH-originated single-target payloads.
    - [ ] Verify Manager-owned and topic/multiplex cases still route through Manager only when semantics require it.
- [ ] Task: Validate runner and runtime communication
    - [ ] Run focused runner transport tests for global runner routes.
    - [ ] Run runner-node tests for `context.hub` and sequence API exposure compatibility.
    - [ ] Run runner-python tests for boot config, hub client, ASGI Guest exposure, and app context parity.
    - [ ] Run runner-bun tests for Broker/fetch, Guest exposure, routing precedence, streaming, and binary payloads.
- [ ] Task: Validate MultiManager communication
    - [ ] Run focused MultiManager Host config and route registration tests.
    - [ ] Verify sub-manager/MultiManager routing remains compatible with selected v0.4.0 APIs.
    - [ ] Verify retired legacy MultiHost behavior remains intentionally unsupported where applicable.
- [ ] Task: Run full requested validation set
    - [ ] Run `npm run build:packages`.
    - [ ] Run `npm run test:packages-no-concurrent` or the narrowed documented equivalent if package-level suites require scoped execution.
    - [ ] Run `npm run lint`.
    - [ ] Run `npm run check:runtime-invariants`.
    - [ ] Run practical BDD smoke validation: `npm run test:bdd-ci-node`, `npm run test:bdd-ci-api-node`, and runtime-specific smoke where applicable.
    - [ ] Classify and document any validation failure according to `workflow.md` before deciding whether it blocks completion.
- [ ] Task: Conductor - User Manual Verification 'Cross-Flow Integration and Full Validation' (Protocol in workflow.md)

## Phase 5: Remove Obsolete Local Forwarding and Finalize Documentation

- [ ] Task: Remove forwarding made redundant by native redirect/tunnel behavior
    - [ ] Remove or shrink `packages/api-server/src/handlers/routed-forward.ts` only for code paths fully replaced by native v0.4.0 behavior.
    - [ ] Remove or shrink `packages/api-server/src/handlers/forward.ts` only where no longer needed by retained compatibility paths.
    - [ ] Remove Manager dummy/internal redirect dispatch code replaced by native 308 redirects.
    - [ ] Remove tests that assert obsolete local-forwarding behavior and replace them with redirect/tunnel expectations.
- [ ] Task: Preserve and document intentional fallbacks
    - [ ] Document any retained local forwarding, including the route family, reason, and future removal condition.
    - [ ] Document unsupported or deferred bidirectional paths if v0.4.0 tunneling does not provide safe parity.
    - [ ] Update Conductor architecture notes to reflect native redirects and upstream tunnels as the current design.
- [ ] Task: Final cleanup checks
    - [ ] Search for stale references to v0.3.1, dummy redirects, pending native follow, and unsupported CONNECT/tunnel assumptions.
    - [ ] Verify no active path reintroduces legacy `@scramjet/verser` or BPMux communication.
    - [ ] Verify public config and docs do not expose private TLS/tunnel material.
- [ ] Task: Final validation and commit readiness
    - [ ] Rerun the narrowest validations affected by forwarding removal.
    - [ ] Rerun `npm run build:packages` and `npm run check:runtime-invariants`.
    - [ ] Run lint and relevant BDD smoke if final removal changes public communication behavior.
    - [ ] Record final validation results, skipped checks, and rationale in the track notes or implementation handoff.
- [ ] Task: Conductor - User Manual Verification 'Remove Obsolete Local Forwarding and Finalize Documentation' (Protocol in workflow.md)

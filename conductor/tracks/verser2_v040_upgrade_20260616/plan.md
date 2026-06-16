# Plan: verser2 v0.4.0 Native Redirects and Upstream Tunnels

## Phase 1: v0.4.0 API Discovery and Compatibility Baseline

- [ ] Task: Confirm v0.4.0 package availability and API changes
    - [ ] Read relevant package codemaps before implementation: Manager, MultiManager, Host, API server, config, types, runner, runner-node, runner-python, and runner-bun.
    - [ ] Verify `@signicode/verser2-*` v0.4.0 packages resolve through the existing authenticated package workflow.
    - [ ] Inspect upstream v0.4.0 public APIs for native 308 redirects, redirect-follow behavior, and upstream host tunneling.
    - [ ] Compare v0.4.0 APIs against current v0.3.1 integration surfaces and record breaking changes.
    - [ ] If a v0.4.0 capability is missing or incompatible with the intended architecture, halt the implementation subtask and produce an upstream-verser2 report before adding local workarounds.
- [ ] Task: Upgrade verser2 dependencies
    - [ ] Update active workspace dependencies from v0.3.1 to v0.4.0 for `@signicode/verser-common`, `@signicode/verser2-host`, `@signicode/verser2-guest-node`, `@signicode/verser2-guest-bun`, and `@signicode/verser2-guest-python` where present.
    - [ ] Update `package-lock.json` using npm.
    - [ ] Preserve package manager guidance: use npm, not yarn.
    - [ ] Update any package-resolution helper or version guard that assumes v0.3.1.
- [ ] Task: Establish compatibility tests before behavior changes
    - [ ] Run or update focused tests proving existing Manager/STH route classification still behaves as documented.
    - [ ] Run or update focused tests proving runner/runtime verser2 transport boot config still parses and starts with v0.4.0.
    - [ ] Run or update focused tests for MultiManager Host setup and route registration.
    - [ ] Run the narrowest build/typecheck for packages affected by dependency/API changes.
- [ ] Task: Conductor - User Manual Verification 'v0.4.0 API Discovery and Compatibility Baseline' (Protocol in workflow.md)

## Phase 2: Native 308 Redirect Adoption

- [ ] Task: Define the native redirect contract
    - [ ] Update the route-forwarding design notes to replace `signicode/verser2#20` pending assumptions with the actual v0.4.0 redirect behavior.
    - [ ] Define how Manager follow-classified routes produce native 308-style redirect responses or verser2-followable metadata.
    - [ ] Define when `direct-route-metadata` remains necessary for STH-originated STH-to-STH payloads.
    - [ ] Define fallback/error behavior when a route is unavailable, not follow-safe, or not representable as a native redirect.
- [ ] Task: Update Manager follow routing implementation
    - [ ] Update `packages/manager/src/lib/route-classifier.ts` and related types only as needed to represent native redirect decisions.
    - [ ] Replace Manager dummy/internal follow dispatch in `packages/manager/src/lib/manager.ts` with native 308-style redirect behavior for follow-safe Manager API requests.
    - [ ] Preserve Manager-owned and Manager-multiplex routes on existing Manager handlers.
    - [ ] Preserve the direct STH-to-STH data-plane constraint: Manager coordinates route ownership but does not proxy STH-originated payloads.
- [ ] Task: Update redirect tests
    - [ ] Update `packages/manager/test/route-classifier.spec.ts` for native redirect decisions and retained metadata cases.
    - [ ] Add Manager tests covering follow-safe reads, state-changing single-owner follow routes, route-unavailable redirects, and non-follow Manager-owned routes.
    - [ ] Update or remove tests that specifically assert dummy internal dispatch where native redirect is now expected.
- [ ] Task: Validate native redirect adoption
    - [ ] Run focused Manager route-classifier and Manager routing tests.
    - [ ] Run affected Manager build/typecheck.
    - [ ] Record any retained dummy/internal forwarding and the reason it remains.
- [ ] Task: Conductor - User Manual Verification 'Native 308 Redirect Adoption' (Protocol in workflow.md)

## Phase 3: Upstream Host Tunneling Integration

- [ ] Task: Define tunnel-enabled communication paths
    - [ ] Identify local forwarding paths in `packages/api-server/src/handlers/routed-forward.ts`, `packages/api-server/src/handlers/forward.ts`, Host RPC forwarding, Manager/STH request forwarding, runner transport, and MultiManager routing.
    - [ ] Classify each path as native tunnel candidate, redirect-only, Manager-owned/multiplexed, or retained fallback.
    - [ ] Define which currently unsupported bidirectional cases, such as CONNECT, `/platform`, or `/inout`, can safely use v0.4.0 tunneling in this track.
    - [ ] Document any paths deliberately left unsupported or deferred.
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

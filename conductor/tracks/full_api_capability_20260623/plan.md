# Implementation Plan: Full API Capability via Verser2 Forwarding

## Phase 0: Branch, Track Artifacts, and PR Review Surface

- [x] Task: Create the Conductor review branch and initial artifacts
    - [x] Branch from the current branch into a dedicated track branch.
    - [x] Create the track directory, `metadata.json`, `spec.md`, `plan.md`, and `index.md` from the approved Conductor artifacts.
    - [x] Update `conductor/tracks.md` with the new track entry.
    - [x] Commit only the initial Conductor track artifacts and tracks registry update.
        - Initial artifact commit: `164f8bd4`.
    - [x] Push the dedicated track branch after the initial Conductor artifact commit.
- [x] Task: Create the GitHub PR after the initial commit
    - [x] Prepare a real multiline Markdown PR description file describing the complete intended TO-BE behavior.
    - [x] Create the PR with `gh pr create --body-file <file>` after the initial Conductor artifact commit has been pushed.
    - [x] Record the PR URL in `plan.md`.
        - PR: https://github.com/0rail/transform-hub/pull/34
- [x] Task: Confirm affected entrypoints and shared surfaces
    - [x] Read relevant codemaps for `bdd`, `packages/api-server`, `packages/api-router`, `packages/host`, `packages/manager`, and `packages/multi-manager`.
    - [x] Confirm the current direct STH v1 RPC path through `HostAPIV1Handler`, `CSIController.forwardRpcRequest()`, and `forwardRoutedRequest()`.
        - Confirmed: `packages/host/src/lib/api/host-api-v1.ts` routes RPC through `rpcMiddleware()`, `packages/host/src/lib/csi-controller.ts` implements `forwardRpcRequest()`, and `packages/api-server/src/handlers/routed-forward.ts` provides the Verser2 routed HTTP forwarder.
    - [x] Confirm the current v2 instance RPC route contract and `InstanceAPIV2` contract-only behavior.
        - Confirmed: `packages/host/src/lib/api/instance-api-v2.ts` binds `rpc` as `routeBinding.contractOnly("RPC duplex forwarding remains handled by v1 compatibility surface.")`.
    - [x] Confirm Manager v1/v2 follow-route redirect behavior and MultiManager `/cpm/:id` Manager handoff behavior.
        - Confirmed: `packages/manager/src/lib/route-classifier.ts` classifies follow routes and `packages/manager/src/lib/manager.ts` currently writes external `308` redirects or internal route metadata; `packages/multi-manager/src/lib/multi-manager.ts` strips `/cpm/:id` and delegates to `manager.router.lookup()`.
    - [x] Review shared packages for existing route metadata, forwarding, and header utilities before adding new code.
        - Shared inventory: `forwardRoutedRequest()` and `normalizeForwardedHeaders()` exist in `@scramjet/api-server`; `@scramjet/api-router` has private redirect response helpers and v2 redirect resolver types; no generic hop-by-hop header sanitizer or shared `x-scramjet-route-*` constants were found.
- [~] Task: Conductor - User Manual Verification 'Phase 0: Branch, Track Artifacts, and PR Review Surface' (Protocol in workflow.md)

## Phase 1: BDD Reproduction and Focused Test Contracts

- [ ] Task: Add the full API Verser2 forwarding BDD feature
    - [ ] Create a new focused BDD feature for full API Verser2 forwarding.
    - [ ] Copy the existing `api-server` sequence fixture into the Manager/MultiManager fixture area.
    - [ ] Add or adapt startup config for a stable instance name suitable for Manager and MultiManager routed scenarios.
    - [ ] Add raw HTTP request steps that can send `Connection` and other hop-by-hop headers intentionally.
- [ ] Task: Cover direct STH-to-sequence RPC behavior in BDD
    - [ ] Add a direct STH v1 scenario for API to local sequence RPC with standard hop-by-hop headers at ingress.
    - [ ] Add a direct STH v2 scenario for `/api/v2/instances/:instanceId/rpc/*` with equivalent request behavior.
    - [ ] Assert the sequence response body proves the request reached the fixture.
- [ ] Task: Cover downward Manager and MultiManager forwarding in BDD
    - [ ] Add a Manager-to-Host/STH-to-sequence downward scenario.
    - [ ] Add a MultiManager-to-Manager-to-Host/STH-to-sequence downward scenario.
    - [ ] Assert these requests tunnel and return the target sequence response rather than stopping at `308`.
- [ ] Task: Cover upward policy behavior in BDD
    - [ ] Add a sequence/runtime-originated route scenario where an authorized upward Manager `308` is resolved and tunneled.
    - [ ] Add an external API-originated upward route scenario where the Hub/STH returns `308` route metadata and does not tunnel.
    - [ ] Add spoofing coverage for client-supplied internal routing/auth headers where practical.
- [ ] Task: Add focused package-level regression tests
    - [ ] Add `@scramjet/api-server` tests for stripping standard hop-by-hop headers and `Connection`-nominated headers.
    - [ ] Add tests for redirect metadata parsing and invalid/unknown redirect handling in the new reusable redirect helper.
    - [ ] Add Host or API-router tests proving v2 instance RPC dispatches through the same forwarding path as v1 where practical.
    - [ ] Add Manager policy or forwarding tests proving allowed downward routes tunnel while external upward routes return `308`.
- [ ] Task: Run the narrowest expected-failure validation
    - [ ] Run the new BDD tag under the process adapter/source execution mode expected for this track.
    - [ ] Run focused package tests expected to fail before implementation.
    - [ ] Record expected failures and any skipped checks in `plan.md`.
- [ ] Task: Create Phase 1 checkpoint and push
    - [ ] Commit only BDD and focused test contract changes.
    - [ ] Push the review branch before manual verification.
    - [ ] Update `plan.md` with the checkpoint commit SHA.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: BDD Reproduction and Focused Test Contracts' (Protocol in workflow.md)

## Phase 2: Implement Verser2 Forwarding, Policy, and v2 RPC

- [ ] Task: Implement shared header sanitization and redirect parsing
    - [ ] Update `normalizeForwardedHeaders()` or its call sites to strip standard hop-by-hop headers.
    - [ ] Strip headers nominated by the incoming `Connection` header.
    - [ ] Add a reusable redirect metadata parser/helper in a separate file.
    - [ ] Keep generic redirect parsing free of Scramjet-specific authorization policy.
- [ ] Task: Implement forwarding policy helpers
    - [ ] Add a separate policy/helper file for route direction and allowed tunnel decisions.
    - [ ] Distinguish local/downward sequence routes, upward Manager routes, peer/sideways routes, and unknown routes.
    - [ ] Ensure external API-originated upward requests return `308` instead of tunneling.
    - [ ] Ensure client-supplied internal routing/auth headers cannot spoof allowed origin.
- [ ] Task: Implement direct STH v1/v2 sequence RPC forwarding
    - [ ] Preserve existing v1 instance and host RPC compatibility.
    - [ ] Implement v2 instance RPC forwarding for `/api/v2/instances/:instanceId/rpc/*` without requiring sequence-specific typings.
    - [ ] Reuse the same safe forwarding/header behavior for v1 and v2 where possible.
- [ ] Task: Implement Manager and MultiManager downward tunneling
    - [ ] Extend Manager follow-route handling so allowed downward targets tunnel through the Manager-to-STH Verser2 broker transport.
    - [ ] Preserve `308` redirect responses for disallowed external upward requests.
    - [ ] Ensure MultiManager `/cpm/:id` paths can use the Manager behavior without adding parallel routing logic.
    - [ ] Keep Manager/MultiManager trust changes minimal and explicit.
- [ ] Task: Implement authorized sequence/runtime upward resolution
    - [ ] Wire Host-side 308 resolution for authorized sequence/runtime-originated Manager calls.
    - [ ] Ensure external API-originated calls to Manager via Hub/STH still return `308`.
    - [ ] Enforce a maximum redirect count and reject unknown route domains.
- [ ] Task: Run focused implementation validation
    - [ ] Run focused `api-server` tests for header sanitization and redirect helper behavior.
    - [ ] Run focused Host/API-router tests for v2 RPC forwarding.
    - [ ] Run focused Manager/MultiManager tests for downward tunneling and upward semi-deny behavior.
    - [ ] Run the new BDD feature tag under the process adapter/source execution mode.
    - [ ] Run targeted TypeScript build checks for changed packages.
- [ ] Task: Perform implementation review and deduplication
    - [ ] Verify shared package reuse was considered and repeated code was extracted where safe.
    - [ ] Verify route direction policy is centralized and not duplicated across handlers.
    - [ ] Verify no unrelated API contract, trust, or adapter behavior changed.
    - [ ] Use Oracle or another read-only review pass for the forwarding/authz design before checkpointing if substantial cross-package changes were made.
- [ ] Task: Create Phase 2 checkpoint and push
    - [ ] Commit the scoped implementation changes after validation.
    - [ ] Push the review branch before manual verification.
    - [ ] Update `plan.md` with the checkpoint commit SHA and validation summary.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Implement Verser2 Forwarding, Policy, and v2 RPC' (Protocol in workflow.md)

## Phase 3: Final Validation, Review, and Track Completion

- [ ] Task: Run final validation gates
    - [ ] Rerun the new BDD feature tag and record the result.
    - [ ] Rerun focused package tests for all changed packages.
    - [ ] Run the narrowest sufficient package build or `npm run build:packages` if cross-package changes require it.
    - [ ] Run lint or a narrower Biome check if changed files require formatting/lint validation.
- [ ] Task: Final review and documentation alignment
    - [ ] Verify `spec.md`, `plan.md`, PR description, and implementation behavior agree.
    - [ ] Verify user-facing `308` behavior is clear and actionable where exposed.
    - [ ] Update docs only if behavior changes are user-facing and not already covered by tests/spec.
    - [ ] Record skipped broad validation and rationale.
- [ ] Task: Final checkpoint and PR readiness
    - [ ] Commit final documentation, validation note, or cleanup changes if any.
    - [ ] Push the review branch.
    - [ ] Update the PR description with final validation results using a body file.
    - [ ] Confirm the PR is ready for manual review.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Validation, Review, and Track Completion' (Protocol in workflow.md)

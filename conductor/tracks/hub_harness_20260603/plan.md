# Implementation Plan: Targeted Hub Harness for Sequence Behavior Tests

## Phase 1: API Inventory, Metadata Semantics, and Test Reorganization

- [x] Task: Create review PR for the track
    - [x] Confirm the current implementation branch and remote tracking branch.
    - [x] Push the current branch if the PR branch is not already available on GitHub.
    - [x] Create or update a GitHub PR for this track at the beginning of work for easier review.
    - [x] Record the PR URL in the track handoff or plan notes.
    - Notes: Separate stacked track PR: https://github.com/0rail/transform-hub/pull/8 (base: `feature/sequence-test-harness`, head: `feature/hub-harness-track`).
- [x] Task: Confirm affected package and API-client surfaces
    - [x] Read `packages/sequence-test/codemap.md` and relevant `packages/sequence-test/src` files.
    - [x] Read `packages/runner-node/src/context.ts` and `packages/runner-node/src/runner-app-context.ts` for real sequence context behavior.
    - [x] Inventory `packages/api-client` HostClient, ManagerClient, InstanceClient, and RPC/stream methods needed by the harness.
    - [x] Confirm no default-path dependency on `@scramjet/sth`, `@scramjet/host`, Docker adapter, Kubernetes adapter, or BDD workflows.
    - Notes: Inventory confirmed `packages/sequence-test` is package-local and currently depends on runner protocol surfaces only; relevant sequence context surfaces are `hub`, `space`, lifecycle, events, local storage, logging/monitoring, and exposed API registration. API-client coverage should target host metadata, sequence/instance/topic operations, manager named data/store/listing, and instance RPC/stream/event/control helpers.
- [x] Task: Write tests for package metadata semantics
    - [x] Test `package.json.main` is required and resolves to an existing file.
    - [x] Test `main` path safety rejects paths outside the fixture directory.
    - [x] Test missing engines defaults to Node-compatible behavior.
    - [x] Test Node-first precedence for multi-engine package metadata.
    - [x] Test invalid engines metadata fails clearly.
    - [x] Test fixture-generated `SEQUENCE_INFO.config.engines` matches resolved runtime.
    - Notes: Added focused metadata semantics coverage in `packages/sequence-test/test/harness/metadata.semantics.spec.ts`.
- [x] Task: Implement package metadata resolver
    - [x] Add a resolver/helper for fixture package metadata.
    - [x] Validate `main` existence and path safety.
    - [x] Resolve engines with Node-first precedence.
    - [x] Integrate resolved metadata with fixture helpers and runner planning where appropriate.
    - Notes: Added `resolveSequenceFixtureMetadata()` and `engines` support in runner launch planning; package metadata remains package-local to `@scramjet/sequence-test`.
- [x] Task: Reorganize tests into harness and fixture behavior directories
    - [x] Create `packages/sequence-test/test/harness/` for harness/helper tests.
    - [x] Create or normalize `packages/sequence-test/test/fixtures/` for live sequence behavior tests and fixture sources.
    - [x] Move harness tests separately from sequence fixture behavior tests without changing behavior.
    - [x] Keep package AVA test discovery working after moves.
    - Notes: Harness/helper specs now live under `test/harness/`; live sequence behavior specs live under `test/fixtures/` alongside fixture sources.
- [x] Task: Validate Phase 1
    - [x] Run focused `@scramjet/sequence-test` tests.
    - [x] Run source lint for changed `packages/sequence-test/src` files.
    - [x] Run package build for `@scramjet/sequence-test`.
    - [x] Record any skipped broader validation and reasons.
    - Notes: Passed `npm test --workspace @scramjet/sequence-test -- --match '*metadata*'`, `npm test --workspace @scramjet/sequence-test`, `npx eslint "packages/sequence-test/src" --ext .ts`, and `npm run build --workspace @scramjet/sequence-test`. Broader Docker/Kubernetes/BDD validation skipped as out of scope for package-local Phase 1 metadata/test-organization changes.
- [x] Task: Conductor - User Manual Verification 'Phase 1: API Inventory, Metadata Semantics, and Test Reorganization' (Protocol in workflow.md)
    - Notes: User approved proceeding to Phase 2 after Phase 1 validation.

## Phase 2: Targeted Hub Harness Core and Compatibility Replacement

- [x] Task: Write tests for Hub harness core behavior
    - [x] Test `createHubHarness()` exposes `context`, `hub`, minimal `space`, routes/defaults, calls timeline, and assertions.
    - [x] Test host metadata methods return sensible default success payloads and record normalized paths.
    - [x] Test sequence and instance API methods record separate paths and bodies.
    - [x] Test topic creation succeeds and records a topic even if no later sequence depends on it.
    - [x] Test call count, payload, and path assertion helpers.
    - [x] Test ordered call assertions against the ordered timeline.
    - Notes: Added targeted Phase 2 coverage in `packages/sequence-test/test/harness/hub-harness.spec.ts`.
- [x] Task: Implement Hub harness core
    - [x] Add `createHubHarness()` and public types.
    - [x] Implement normalized call timeline with monotonic sequence numbers.
    - [x] Implement sensible default responses for common HostClient-style endpoints.
    - [x] Implement route/response override support where tests need explicit behavior.
    - [x] Implement assertion helpers for called, call count, payload/body matching, and order.
    - Notes: Added deterministic in-memory `createHubHarness()` in `packages/sequence-test/src/hub-harness.ts`.
- [x] Task: Replace simple Hub mock API
    - [x] Remove or replace the old simple `createHubMock()` implementation.
    - [x] Update exports, docs, and tests to use the targeted Hub harness API.
    - [x] Ensure legacy simple route-table tests are either removed or rewritten as Hub harness tests.
    - Notes: `createHubMock()` now wraps the targeted harness hub while preserving low-level route-table compatibility.
- [x] Task: Validate Phase 2
    - [x] Run focused Hub harness tests.
    - [x] Run all `@scramjet/sequence-test` tests.
    - [x] Run package build for `@scramjet/sequence-test`.
    - Notes: Passed `npm test --workspace @scramjet/sequence-test -- --match '*hub*'`, `npm test --workspace @scramjet/sequence-test`, `npx eslint "packages/sequence-test/src" --ext .ts`, and `npm run build --workspace @scramjet/sequence-test`.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Targeted Hub Harness Core and Compatibility Replacement' (Protocol in workflow.md)
    - Notes: User approved proceeding to Phase 3 after Phase 2 validation.

## Phase 3: RPC, Topics, and Core Streaming Support

- [ ] Task: Write tests for RPC and topic behavior
    - [ ] Test normal instance/sequence RPC calls record method, target, path, body, and response.
    - [ ] Test host-level and instance-level RPC paths remain distinct.
    - [ ] Test topic create/list/delete/send/get behavior with sensible defaults.
    - [ ] Test streamed RPC request body capture from string, Buffer, and Readable inputs where practical.
    - [ ] Test streamed RPC/topic response returns a Readable with configured/default data.
- [ ] Task: Implement RPC and topic harness behavior
    - [ ] Implement RPC client stubs or in-memory transport for normal RPC methods.
    - [ ] Implement core streamed request body capture.
    - [ ] Implement Readable response streams for core streamed RPC/topic methods.
    - [ ] Implement topic registry defaults and path-specific recording.
    - [ ] Preserve deterministic behavior and avoid full STH/host startup.
- [ ] Task: Validate Phase 3
    - [ ] Run focused RPC/topic/stream tests.
    - [ ] Run all `@scramjet/sequence-test` tests.
    - [ ] Run source lint and package build for changed package files.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: RPC, Topics, and Core Streaming Support' (Protocol in workflow.md)

## Phase 4: Sequence Context Harness for Lifecycle, Storage, Events, Logs, and API Registration

- [ ] Task: Write tests for context behavior
    - [ ] Test `keepAlive()`, `end()`, and `destroy()` record lifecycle actions and monitoring-style data.
    - [ ] Test stop/start or control-intent sequence fixture behavior can be asserted through the harness.
    - [ ] Test `emit()` and `emitToSpace()` record event scope, name, message, and order.
    - [ ] Test localStorage `getItem`, `setItem`, `removeItem`, and `clear` update state and timeline.
    - [ ] Test logger calls are captured by level and message/details.
    - [ ] Test exposed API registration records path and handler metadata.
    - [ ] Test minimal `space` mock allows calls without crashing.
- [ ] Task: Implement context harness
    - [ ] Build AppContext-compatible `context` around the Hub harness.
    - [ ] Add lifecycle, events, localStorage, logger, and API registration captures.
    - [ ] Add minimal `space` mock behavior and document that detailed `space` assertions are out of scope.
    - [ ] Integrate context with `runSequence()` examples and sequence fixture tests.
- [ ] Task: Validate Phase 4
    - [ ] Run focused context harness tests.
    - [ ] Run all `@scramjet/sequence-test` tests.
    - [ ] Run source lint and package build for changed package files.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Sequence Context Harness for Lifecycle, Storage, Events, Logs, and API Registration' (Protocol in workflow.md)

## Phase 5: Live Fixture Sequences and Ordered Behavior Assertions

- [ ] Task: Write live sequence fixture tests against the new harness
    - [ ] Add or update package-json-backed fixture sequences for metadata/runtime resolution.
    - [ ] Add fixture sequence that calls host metadata, topics, RPC, events, storage, logging, lifecycle, and exposed API registration in known order.
    - [ ] Add fixture tests that execute sequence code through `runSequence()` and assert call timeline order.
    - [ ] Add fixture tests for streamed RPC/topic behavior using live sequence code.
    - [ ] Add fixture tests proving `this.space` can be called minimally without crashing.
- [ ] Task: Implement or update fixture sequences
    - [ ] Add package.json files to fixture sequences where relevant.
    - [ ] Add sequence fixtures for Hub APIs, RPC, topics, storage/logging/events, and stream usage.
    - [ ] Update docs examples to reference fixture behavior rather than harness internals.
- [ ] Task: Validate Phase 5
    - [ ] Run fixture behavior tests.
    - [ ] Run all `@scramjet/sequence-test` tests.
    - [ ] Run source lint and package build for changed package files.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Live Fixture Sequences and Ordered Behavior Assertions' (Protocol in workflow.md)

## Phase 6: Documentation, Final Validation, and Handoff

- [ ] Task: Update documentation
    - [ ] Update README to point sequence developers to the new Hub harness for Hub/context behavior tests.
    - [ ] Update docs for Hub APIs, RPC, topics, streams, lifecycle, storage, events, logging, and exposed API registration.
    - [ ] Document package metadata/runtime resolution behavior and Node-first multi-engine precedence.
    - [ ] Document limitations: minimal `space`, no full STH/Docker/Kubernetes/BDD default path, and experimental package status.
- [ ] Task: Run final validation
    - [ ] Run all focused `@scramjet/sequence-test` tests.
    - [ ] Run `npm run build --workspace @scramjet/sequence-test` or the narrowest sufficient package build.
    - [ ] Run `npx eslint "packages/sequence-test/src" --ext .ts` or equivalent changed-source lint.
    - [ ] Confirm runtime invariant check is unnecessary unless runtime protocol surfaces changed; otherwise run `npm run check:runtime-invariants`.
    - [ ] Record skipped Docker/Kubernetes/BDD validation as out of scope unless later required.
- [ ] Task: Final review and handoff
    - [ ] Confirm requirements and acceptance criteria are satisfied.
    - [ ] Confirm tests, docs, exports, and fixture layout are aligned.
    - [ ] Prepare concise implementation summary and known limitations.
- [ ] Task: Conductor - User Manual Verification 'Phase 6: Documentation, Final Validation, and Handoff' (Protocol in workflow.md)

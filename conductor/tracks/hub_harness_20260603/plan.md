# Implementation Plan: Targeted Hub Harness for Sequence Behavior Tests

## Phase 1: API Inventory, Metadata Semantics, and Test Reorganization

- [x] Task: Create review PR for the track
    - [x] Confirm the current implementation branch and remote tracking branch.
    - [x] Push the current branch if the PR branch is not already available on GitHub.
    - [x] Create or update a GitHub PR for this track at the beginning of work for easier review.
    - [x] Record the PR URL in the track handoff or plan notes.
    - Notes: Existing open PR for `feature/sequence-test-harness`: https://github.com/0rail/transform-hub/pull/7
- [ ] Task: Confirm affected package and API-client surfaces
    - [ ] Read `packages/sequence-test/codemap.md` and relevant `packages/sequence-test/src` files.
    - [ ] Read `packages/runner-node/src/context.ts` and `packages/runner-node/src/runner-app-context.ts` for real sequence context behavior.
    - [ ] Inventory `packages/api-client` HostClient, ManagerClient, InstanceClient, and RPC/stream methods needed by the harness.
    - [ ] Confirm no default-path dependency on `@scramjet/sth`, `@scramjet/host`, Docker adapter, Kubernetes adapter, or BDD workflows.
- [ ] Task: Write tests for package metadata semantics
    - [ ] Test `package.json.main` is required and resolves to an existing file.
    - [ ] Test `main` path safety rejects paths outside the fixture directory.
    - [ ] Test missing engines defaults to Node-compatible behavior.
    - [ ] Test Node-first precedence for multi-engine package metadata.
    - [ ] Test invalid engines metadata fails clearly.
    - [ ] Test fixture-generated `SEQUENCE_INFO.config.engines` matches resolved runtime.
- [ ] Task: Implement package metadata resolver
    - [ ] Add a resolver/helper for fixture package metadata.
    - [ ] Validate `main` existence and path safety.
    - [ ] Resolve engines with Node-first precedence.
    - [ ] Integrate resolved metadata with fixture helpers and runner planning where appropriate.
- [ ] Task: Reorganize tests into harness and fixture behavior directories
    - [ ] Create `packages/sequence-test/test/harness/` for harness/helper tests.
    - [ ] Create or normalize `packages/sequence-test/test/fixtures/` for live sequence behavior tests and fixture sources.
    - [ ] Move harness tests separately from sequence fixture behavior tests without changing behavior.
    - [ ] Keep package AVA test discovery working after moves.
- [ ] Task: Validate Phase 1
    - [ ] Run focused `@scramjet/sequence-test` tests.
    - [ ] Run source lint for changed `packages/sequence-test/src` files.
    - [ ] Run package build for `@scramjet/sequence-test`.
    - [ ] Record any skipped broader validation and reasons.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: API Inventory, Metadata Semantics, and Test Reorganization' (Protocol in workflow.md)

## Phase 2: Targeted Hub Harness Core and Compatibility Replacement

- [ ] Task: Write tests for Hub harness core behavior
    - [ ] Test `createHubHarness()` exposes `context`, `hub`, minimal `space`, routes/defaults, calls timeline, and assertions.
    - [ ] Test host metadata methods return sensible default success payloads and record normalized paths.
    - [ ] Test sequence and instance API methods record separate paths and bodies.
    - [ ] Test topic creation succeeds and records a topic even if no later sequence depends on it.
    - [ ] Test call count, payload, and path assertion helpers.
    - [ ] Test ordered call assertions against the ordered timeline.
- [ ] Task: Implement Hub harness core
    - [ ] Add `createHubHarness()` and public types.
    - [ ] Implement normalized call timeline with monotonic sequence numbers.
    - [ ] Implement sensible default responses for common HostClient-style endpoints.
    - [ ] Implement route/response override support where tests need explicit behavior.
    - [ ] Implement assertion helpers for called, call count, payload/body matching, and order.
- [ ] Task: Replace simple Hub mock API
    - [ ] Remove or replace the old simple `createHubMock()` implementation.
    - [ ] Update exports, docs, and tests to use the targeted Hub harness API.
    - [ ] Ensure legacy simple route-table tests are either removed or rewritten as Hub harness tests.
- [ ] Task: Validate Phase 2
    - [ ] Run focused Hub harness tests.
    - [ ] Run all `@scramjet/sequence-test` tests.
    - [ ] Run package build for `@scramjet/sequence-test`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Targeted Hub Harness Core and Compatibility Replacement' (Protocol in workflow.md)

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

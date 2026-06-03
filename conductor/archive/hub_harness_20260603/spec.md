# Specification: Targeted Hub Harness for Sequence Behavior Tests

## Overview

Create a follow-up feature track for `@scramjet/sequence-test` that replaces the current simple Hub mock with a targeted Hub/context harness for testing live-executed sequence behavior. The harness should let sequence developers run fixture sequences against a realistic internal context and assert Hub/API calls, context interactions, streams, metadata resolution, and call order without starting a full Scramjet Transform Hub, Docker adapter, Kubernetes adapter, or BDD workflow.

This track builds on the existing experimental `packages/sequence-test` package and must keep it explicitly scoped as an in-progress sequence behavior harness, not a replacement for package tests, BDD tests, adapter tests, or runtime invariant checks.

## Functional Requirements

### 1. Package Metadata and Runtime Resolution

- Fixture sequences must include and test `package.json` metadata where relevant.
- The harness must validate `package.json.main` existence.
- The harness must reject `main` paths that escape the fixture directory.
- The harness must validate `engines` metadata and map it to runtime/runner planning behavior.
- Missing engines should default to Node-compatible behavior.
- Multi-engine metadata must use Node-first precedence, matching `selectRuntimeKind()` behavior.
- Invalid engines metadata must fail clearly.

### 2. Targeted Hub Harness

- Replace the current simple `createHubMock()` approach with a richer targeted Hub harness API.
- The new harness should expose an AppContext-compatible `context` usable by direct `runSequence()` tests.
- The harness should provide `this.hub` behavior for common Scramjet Hub APIs with sensible success defaults unless a test overrides responses.
- The harness should provide a minimal `this.space` mock so sequence code that calls `this.space` does not crash, but detailed `this.space` assertions are out of scope for this track.
- All calls must be recorded in a normalized timeline with method, path, body, stream/body metadata, response metadata, and monotonic sequence order.
- The harness must support assertions for:
  - whether a call happened,
  - how many times matching calls happened,
  - call payload/body details,
  - and whether calls happened in a specific order.

### 3. Hub API Coverage

The harness must cover the following `this.hub` behavior with route recording and sensible success responses:

- Host metadata endpoints: version, status, config, load-check.
- Sequence endpoints: list, send/upload, get, delete, and start.
- Instance endpoints: list, info, control, and event-related operations.
- Topic endpoints: create topic, list topics, delete topic, send named/topic data, and get named/topic data.
- RPC calls to other sequences/instances over API, including normal request/response RPC.
- Core streamed RPC/topic interactions:
  - capture streamed request bodies/chunks,
  - return readable response streams where applicable.
- Paths must be recorded separately and consistently, e.g. `/api/v1/topics`, `/api/v1/topic/:topic`, `/api/v1/instance/:id/rpc/...`, and host-level RPC paths must not collapse into one bucket.

### 4. Context API Coverage

The harness context must make these sequence-facing behaviors testable:

- Lifecycle calls: `keepAlive()`, `end()`, `destroy()`, and related stop/start or control intent used by sequence fixtures.
- Events: `emit()` and `emitToSpace()` with recorded event scope/name/message.
- Local storage: `getItem`, `setItem`, `removeItem`, and `clear` with inspectable state and operation timeline.
- Logging: capture logger calls by level and message/details.
- Exposed API registration: record `this.api.use(...)` and similar route registration so sequence tests can assert registered endpoints.

### 5. Test Organization

- Separate harness tests from fixture behavior tests.
- Harness tests should live under `packages/sequence-test/test/harness/`.
- Sequence fixture behavior tests should live under `packages/sequence-test/test/fixtures/`.
- Low-level helper tests may be moved or left in harness-oriented folders as appropriate, but fixture sequence tests must be clearly separated from harness unit tests.

### 6. Documentation

- Update package docs to present the Hub harness as the recommended way to test sequence Hub/context behavior.
- Keep docs sequence-developer facing.
- Document current limitations, including minimal `this.space` behavior and avoidance of full STH/Docker/Kubernetes/BDD execution.

## Non-Functional Requirements

- Preserve runner protocol compatibility; do not introduce hidden runtime protocol changes.
- Avoid broad STH/host imports or default orchestration through `@scramjet/sth`, `@scramjet/host`, Docker adapter, Kubernetes adapter, or BDD workflows.
- Prefer real API-client shapes where practical to reduce drift, but keep the harness deterministic and in-memory.
- Keep changes package-local to `packages/sequence-test` unless documentation or Conductor artifacts require updates.
- Use npm commands for validation.

## Acceptance Criteria

- `createHubMock()` is replaced by the new targeted harness API and tests/docs are updated accordingly.
- Tests demonstrate package metadata validation for main path, engine resolution, missing engines default, invalid engines, and Node-first multi-engine precedence.
- Tests demonstrate Hub API call recording and sensible default responses.
- Tests demonstrate topic creation handling even if a sequence does not later depend on the topic.
- Tests demonstrate normal RPC calls and core streamed request/response support.
- Tests demonstrate lifecycle, events, localStorage, logging, and API registration capture.
- Tests demonstrate ordered call assertions against live-executed fixture sequence code.
- Harness tests and fixture behavior tests are organized into separate directories.
- Focused `@scramjet/sequence-test` package tests and build pass.
- Source lint passes for changed `packages/sequence-test/src` files.

## Out of Scope

- Full detailed `this.space` assertion coverage beyond a minimal non-crashing mock.
- Full Transform Hub startup.
- Docker/Kubernetes adapter execution.
- BDD smoke workflow execution unless later explicitly required.
- Replacing package tests, BDD tests, adapter tests, or runtime invariant checks across the repo.
- Complete production parity for every API-client edge case not needed by sequence behavior tests.

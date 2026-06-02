# Implementation Plan: Sequence Test Harness Package

## Phase 1: Package Foundation and Existing Protocol Inventory

- [x] Task: Confirm affected packages, entrypoints, and protocol contracts
    - [x] Read `packages/runner-node/codemap.md`, `packages/runner/codemap.md`, `packages/runner-python/codemap.md`, and `packages/runner-bun/codemap.md`.
    - [x] Confirm runtime wrapper entrypoints for Node, Python, and Bun.
    - [x] Confirm boot config, fd/control/monitoring, and instances-server channel contracts.
    - [x] Confirm existing fake host test utilities and reusable implementation boundaries.
- [x] Task: Inventory reusable fixtures before adding new ones
    - [x] Node fixtures from `packages/runner-node/test/fixtures`.
    - [x] Fake instances server behavior from `packages/runner/test/transport/fake-instances-server.ts`.
    - [x] Python parity fixtures from `packages/runner-python/tests/parity/fixtures`.
    - [x] Bun fixtures from `packages/runner-bun/test/fixtures`.
    - [x] Identify only missing fixture cases for API exposure and Hub-request mocking.
- [x] Task: Create `@scramjet/sequence-test` workspace package skeleton
    - [x] Add `packages/sequence-test/package.json` with build/test scripts aligned to workspace conventions.
    - [x] Add `tsconfig.json`, `tsconfig.build.json` or package-level references as needed.
    - [x] Add `src/index.ts` public exports.
    - [x] Add package codemap or README placeholder if consistent with package conventions.
    - [x] Wire the package into workspace build/test flows if required by existing scripts.
- [x] Task: Write initial package tests before implementation
    - [x] Add AVA-style TypeScript tests for public API shape.
    - [x] Add tests for deterministic cleanup behavior using placeholder/minimal fixtures.
    - [x] Add tests that verify unsupported runtime limitations are reported clearly.
- [x] Task: Implement minimal package foundation
    - [x] Implement public option/result types for `createSequenceTest()` and `runSequence()`.
    - [x] Implement lifecycle shell with start/close/wait placeholders wired for later phases.
    - [x] Implement timeout and cleanup primitives.
- [x] Task: Validate Phase 1
    - [x] Run the narrowest relevant package build/test command for `packages/sequence-test`.
    - [x] Run lint or targeted TypeScript validation if available for the package.
    - [x] Record skipped validation and reasons.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Package Foundation and Existing Protocol Inventory' (Protocol in workflow.md)

## Phase 2: Fake Host, Boot Config, and Runtime Launching

- [x] Task: Write tests for fake host and channel behavior
    - [x] Test instance/channel handshake validation.
    - [x] Test channel waiters and timeout behavior.
    - [x] Test monitoring frame parsing from CRLF-delimited JSON frames.
    - [x] Test raw channel capture for output/log streams.
- [x] Task: Generalize fake instances server behavior
    - [x] Move or reimplement `packages/runner/test/transport/fake-instances-server.ts` behavior in `packages/sequence-test/src`.
    - [x] Support `IN`, `OUT`, `LOG`, and `REQUESTS` channels where runtime support exists.
    - [x] Expose deterministic `awaitChannel()`, raw capture, parsed monitoring frames, harness errors, and `close()`.
- [x] Task: Write tests for runner-compatible env and process launching
    - [x] Test creation of adapter-compatible env for the existing runner.
    - [x] Test runtime command resolution in source and built-tree modes where feasible.
    - [x] Test child process cleanup on normal completion, timeout, and errors.
- [x] Task: Implement runner-compatible launch foundation
    - [x] Build adapter-compatible env for `@scramjet/runner`: `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO`, `INSTANCES_SERVER_HOST`, `INSTANCES_SERVER_PORT`, and `INSTANCE_ID`.
    - [x] Resolve and spawn the existing runner entrypoint in source-tree and built-tree modes.
    - [x] Let `@scramjet/runner` write boot config, select executor, and spawn runtime wrappers.
    - [x] Capture runner stdout/stderr, exit code, signal, lifecycle frames, and cleanup errors.
    - [x] Ensure child processes and temp files are cleaned up.
- [x] Task: Validate Phase 2
    - [x] Run focused `@scramjet/sequence-test` package tests.
    - [x] Run relevant runner-node tests if fake host behavior was extracted or shared.
    - [x] Run package build for affected packages.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Fake Host, Boot Config, and Runtime Launching' (Protocol in workflow.md)

## Phase 3: Input, Output, Logs, Monitoring, and Control

- [x] Task: Write tests for input helpers
    - [x] Test text input framing and completion.
    - [x] Test bytes/buffer input framing and completion.
    - [x] Test NDJSON input serialization and completion.
    - [x] Test stream input where practical.
- [x] Task: Implement input driver
    - [x] Implement `input.text()`.
    - [x] Implement `input.bytes()`.
    - [x] Implement `input.ndjson()`.
    - [x] Implement `input.stream()` where practical.
    - [x] Implement `input.end()` and safe repeated-end handling.
- [x] Task: Write tests for output, logs, and monitoring capture
    - [x] Test raw, text, line, and NDJSON output helpers.
    - [x] Test log capture on the `LOG` channel.
    - [x] Test monitoring frame capture and lifecycle waiters.
    - [x] Test error reporting for stopped/failed runtime frames.
- [x] Task: Implement output, logs, monitoring, and assertions
    - [x] Implement `output.raw()`, `output.text()`, `output.lines()`, and `output.ndjson()`.
    - [x] Implement log capture helpers.
    - [x] Implement monitoring frame storage and `waitForCompletion()`.
    - [x] Implement minimal assertions including `completed()` and `noRuntimeErrors()`.
- [x] Task: Write and pass one-shot Node sequence tests
    - [x] Add a simple Node fixture that maps NDJSON input to output.
    - [x] Test `runSequence()` with the fixture.
    - [x] Confirm AVA usage example matches public API.
- [x] Task: Validate Phase 3
    - [x] Run focused `@scramjet/sequence-test` package tests.
    - [x] Run build for affected packages.
    - [x] Run lint if source changes require it.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Input, Output, Logs, Monitoring, and Control' (Protocol in workflow.md)

## Phase 4: Sequence API Request Testing

- [x] Task: Write tests for exposed sequence API discovery
    - [x] Add a Node sequence fixture that registers an API endpoint.
    - [x] Test that the harness discovers expose host/port from monitoring/handshake data.
    - [x] Test request behavior against the direct sequence API server.
- [x] Task: Implement sequence request client
    - [x] Add `expose` option handling and boot config fields.
    - [x] Parse exposed API connection details from runtime data.
    - [x] Implement `harness.request.fetch()`.
    - [x] Implement convenience `get()` and `post()` helpers.
- [x] Task: Validate Phase 4
    - [x] Run focused package tests for sequence API requests.
    - [x] Run runner-node tests if API exposure assumptions touch existing behavior.
    - [x] Record any unsupported runtime behavior.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Sequence API Request Testing' (Protocol in workflow.md)

## Phase 5: Mock Hub Requests over REQUESTS/BPMux

- [x] Task: Write tests for Hub mock routing and capture
    - [x] Add a Node sequence fixture that calls `this.hub` or `this.space`.
    - [x] Test route registration and JSON response behavior.
    - [x] Test request capture including method, path, headers, and body.
    - [x] Test assertion helper for expected Hub calls.
- [x] Task: Implement Hub mock transport
    - [x] Attach a BPMux peer to the fake host `REQUESTS` channel where supported.
    - [x] Feed multiplexed HTTP streams into a local mock router/server implementation.
    - [x] Implement route registration, default responses, and request capture.
    - [x] Expose `harness.hub.requests()` and minimal hub assertion helpers.
- [x] Task: Document runtime limitations for Hub mocking
    - [x] Document Node first-class support.
    - [x] Document Python behavior when `REQUESTS` transport is unavailable.
    - [x] Document Bun hosted delegation behavior and any strict-runtime handling.
- [x] Task: Validate Phase 5
    - [x] Run focused package tests for Hub mock behavior.
    - [x] Run build for affected packages.
    - [x] Run runtime invariant checks if protocol/channel behavior changed.
- [x] Task: Conductor - User Manual Verification 'Phase 5: Mock Hub Requests over REQUESTS/BPMux' (Protocol in workflow.md)

## Phase 6: Python and Bun Node-Authored Sequence Tests

- [x] Task: Write tests for Python sequence fixtures from Node tests
    - [x] Add a minimal Python sequence fixture.
    - [x] Test input/output and lifecycle behavior through the Node-authored harness.
    - [x] Test clear reporting for unsupported Python Hub mock behavior if applicable.
- [x] Task: Write tests for Bun sequence fixtures from Node tests
    - [x] Add a minimal Bun sequence fixture.
    - [x] Test supported no-host or delegated hosted behavior explicitly.
    - [x] Test clear strict-runtime or delegation messaging.
- [x] Task: Add Python/Bun runner-env support
    - [x] Map `runtime` option to `SequenceInfo.config.engines`.
    - [x] Reuse existing `@scramjet/runner` executor selection.
    - [x] Reuse fake host, input/output, monitoring, and cleanup helpers.
    - [x] Document local tooling prerequisites and skipped-test behavior.
    - [x] Surface Bun delegation behavior clearly and add `strictRuntime` or equivalent option if needed.
- [x] Task: Validate Phase 6
    - [x] Run focused package tests for Python and Bun paths where local tooling is available.
    - [x] Run relevant runtime parity tests if runtime wrapper assumptions changed.
    - [x] Record skipped validation when Python or Bun tooling is unavailable.
- [x] Task: Conductor - User Manual Verification 'Phase 6: Python and Bun Node-Authored Sequence Tests' (Protocol in workflow.md)

## Phase 7: AVA Usage Documentation

- [x] Task: Consult Oracle for documentation wording
    - [x] Ask `@oracle` to review the intended README/example wording for clarity, accuracy, and developer usefulness.
    - [x] Incorporate Oracle guidance into the final documentation wording before publishing examples.
- [x] Task: Document how to use `@scramjet/sequence-test` with AVA
    - [x] Add a package README section or dedicated docs page showing AVA setup for `@scramjet/sequence-test`.
    - [x] Include a minimal one-shot AVA example using `runSequence()`.
    - [x] Include an interactive AVA example using `createSequenceTest()` with input, output, and lifecycle assertions.
    - [x] Include an AVA example for calling a sequence-exposed API endpoint.
    - [x] Include an AVA example for mocked Hub calls with explicit route registration and request assertions.
    - [x] Explain cleanup expectations, timeouts, fixture usage, and skipped runtime behavior for Python/Bun tooling.
- [x] Task: Validate Phase 7 documentation
    - [x] Confirm examples match the public API implemented by earlier phases.
    - [x] Confirm examples avoid starting a real STH, Docker adapter, or Kubernetes adapter.
    - [x] Confirm examples use existing or documented fixture helpers.
- [x] Task: Conductor - User Manual Verification 'Phase 7: AVA Usage Documentation' (Protocol in workflow.md)

## Phase 7a: Documentation Reframe for Sequence Developers

- [x] Task: Reframe README for sequence-developer audience
    - [x] Replace emphasis on harness internals (hub mock, input driver, runner env, launch plans) with sequence-author usage.
    - [x] Keep README short: install/AVA setup, basic "maps NDJSON input" example, and links to package docs.
    - [x] Move internal/protocol-oriented details (input driver, runner env, launch plans, fake instances server) into `packages/sequence-test/docs/runner-behavior.md`.
    - [x] Remove hub mock examples from README; hub mock is supporting infrastructure, not a thing to test.
    - [x] Prefer examples framed as testing a sequence's behavior: input/output, appcontext, host calls, lifecycle calls, events, and exposed API.
- [ ] Task: Create sequence-developer docs folder
    - [x] Create `packages/sequence-test/docs/` directory.
    - [x] Add `testing-input-output.md` with examples exercising fixture sequences.
    - [x] Add `testing-appcontext.md` with examples exercising fixture sequences.
    - [x] Add `testing-hub-calls.md` with examples exercising fixture sequences.
    - [x] Add `testing-lifecycle-calls.md` with examples exercising fixture sequences.
    - [x] Add `testing-events.md` with examples exercising fixture sequences.
    - [x] Add `testing-exposed-api.md` with examples exercising fixture sequences.
    - [x] Add `runner-behavior.md` for protocol-level helpers (input driver, runner env, launch plans, fake instances server).
    - [ ] Ensure all non-`runner-behavior.md` examples are AVA tests for fixture sequences, not unit tests for harness internals.
- [ ] Task: Validate Phase 7a documentation reframe
    - [ ] Confirm README examples test sequences, not harness internals.
    - [ ] Confirm hub mock examples are absent from README and only appear in `docs/` as supporting infrastructure.
    - [ ] Confirm `docs/testing-*.md` examples use fixture sequences and demonstrate real sequence behavior.
    - [ ] Confirm `docs/runner-behavior.md` surfaces protocol-level details without implying they are the primary use case.

## Phase 8: Sequence Fixtures, AGENTS.md Guidance, and Final Validation

- [ ] Task: Write tests for fixture helpers
    - [ ] Test temporary Node fixture directory creation and cleanup.
    - [ ] Test temporary Python fixture directory creation and cleanup.
    - [ ] Test temporary Bun fixture directory creation and cleanup.
- [ ] Task: Implement fixture helpers
    - [ ] Implement file-map based fixture creation.
    - [ ] Implement runtime-specific fixture helper aliases.
    - [ ] Implement cleanup integration with harness lifecycle.
- [ ] Task: Add appcontext sequence fixture and test
    - [ ] Create fixture sequence that reads/writes `appcontext`.
    - [ ] Write AVA test demonstrating appcontext behavior.
- [ ] Task: Add hub-call sequence fixture and test
    - [ ] Create fixture sequence that makes outbound requests to the Hub (e.g. GET version, POST events).
    - [ ] Write AVA test using hub mock to capture and assert on those requests.
- [ ] Task: Add lifecycle-call sequence fixture and test
    - [ ] Create fixture sequence that calls stop/start or similar lifecycle operations.
    - [ ] Write AVA test demonstrating lifecycle interaction.
- [ ] Task: Add events sequence fixture and test
    - [ ] Create fixture sequence that uses the events mechanism.
    - [ ] Write AVA test demonstrating event emission/consumption.
- [ ] Task: Add exposed-api sequence fixture and test
    - [ ] Create fixture sequence that registers an HTTP API endpoint.
    - [ ] Write AVA test using `createSequenceRequestClient` to call the exposed endpoint.
- [ ] Task: Update AGENTS.md for sequence-test package status
    - [ ] Add a note that `@scramjet/sequence-test` is experimental/in-progress and must not be treated as the default valid testing solution for other packages.
    - [ ] Instruct agents to keep using each package's existing AVA tests and package build/lint validation.
    - [ ] Instruct agents not to replace package tests, BDD tests, or runtime validation with `@scramjet/sequence-test` unless explicitly directed.
- [ ] Task: Run final validation
    - [ ] Run focused `@scramjet/sequence-test` tests.
    - [ ] Run `npm run build:packages` or the narrowest sufficient package build.
    - [ ] Run `npm run lint` if required for changed files.
    - [ ] Run `npm run check:runtime-invariants` if runtime protocol surfaces changed.
    - [ ] Record skipped Docker/Kubernetes/BDD validation as out of scope unless later required.
    - [ ] Confirm no default-path imports or orchestration from @scramjet/sth, @scramjet/host, Docker adapter, Kubernetes adapter, or BDD workflows.
    - [ ] Confirm README examples test sequences, not harness internals.
    - [ ] Confirm AGENTS.md includes sequence-test status note.
- [ ] Task: Final review and handoff
    - [ ] Confirm requirements and acceptance criteria are satisfied.
    - [ ] Confirm docs, tests, and implementation are aligned.
    - [ ] Prepare concise implementation summary and known limitations.
- [ ] Task: Conductor - User Manual Verification 'Phase 8: Sequence Fixtures, AGENTS.md Guidance, and Final Validation' (Protocol in workflow.md)

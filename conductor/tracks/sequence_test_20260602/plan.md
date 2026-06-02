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

- [ ] Task: Write tests for exposed sequence API discovery
    - [ ] Add a Node sequence fixture that registers an API endpoint.
    - [ ] Test that the harness discovers expose host/port from monitoring/handshake data.
    - [ ] Test request behavior against the direct sequence API server.
- [ ] Task: Implement sequence request client
    - [ ] Add `expose` option handling and boot config fields.
    - [ ] Parse exposed API connection details from runtime data.
    - [ ] Implement `harness.request.fetch()`.
    - [ ] Implement convenience `get()` and `post()` helpers.
- [ ] Task: Validate Phase 4
    - [ ] Run focused package tests for sequence API requests.
    - [ ] Run runner-node tests if API exposure assumptions touch existing behavior.
    - [ ] Record any unsupported runtime behavior.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Sequence API Request Testing' (Protocol in workflow.md)

## Phase 5: Mock Hub Requests over REQUESTS/BPMux

- [ ] Task: Write tests for Hub mock routing and capture
    - [ ] Add a Node sequence fixture that calls `this.hub` or `this.space`.
    - [ ] Test route registration and JSON response behavior.
    - [ ] Test request capture including method, path, headers, and body.
    - [ ] Test assertion helper for expected Hub calls.
- [ ] Task: Implement Hub mock transport
    - [ ] Attach a BPMux peer to the fake host `REQUESTS` channel where supported.
    - [ ] Feed multiplexed HTTP streams into a local mock router/server implementation.
    - [ ] Implement route registration, default responses, and request capture.
    - [ ] Expose `harness.hub.requests()` and minimal hub assertion helpers.
- [ ] Task: Document runtime limitations for Hub mocking
    - [ ] Document Node first-class support.
    - [ ] Document Python behavior when `REQUESTS` transport is unavailable.
    - [ ] Document Bun hosted delegation behavior and any strict-runtime handling.
- [ ] Task: Validate Phase 5
    - [ ] Run focused package tests for Hub mock behavior.
    - [ ] Run build for affected packages.
    - [ ] Run runtime invariant checks if protocol/channel behavior changed.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Mock Hub Requests over REQUESTS/BPMux' (Protocol in workflow.md)

## Phase 6: Python and Bun Node-Authored Sequence Tests

- [ ] Task: Write tests for Python sequence fixtures from Node tests
    - [ ] Add a minimal Python sequence fixture.
    - [ ] Test input/output and lifecycle behavior through the Node-authored harness.
    - [ ] Test clear reporting for unsupported Python Hub mock behavior if applicable.
- [ ] Task: Write tests for Bun sequence fixtures from Node tests
    - [ ] Add a minimal Bun sequence fixture.
    - [ ] Test supported no-host or delegated hosted behavior explicitly.
    - [ ] Test clear strict-runtime or delegation messaging.
- [ ] Task: Add Python/Bun runner-env support
    - [ ] Map `runtime` option to `SequenceInfo.config.engines`.
    - [ ] Reuse existing `@scramjet/runner` executor selection.
    - [ ] Reuse fake host, input/output, monitoring, and cleanup helpers.
    - [ ] Document local tooling prerequisites and skipped-test behavior.
    - [ ] Surface Bun delegation behavior clearly and add `strictRuntime` or equivalent option if needed.
- [ ] Task: Validate Phase 6
    - [ ] Run focused package tests for Python and Bun paths where local tooling is available.
    - [ ] Run relevant runtime parity tests if runtime wrapper assumptions changed.
    - [ ] Record skipped validation when Python or Bun tooling is unavailable.
- [ ] Task: Conductor - User Manual Verification 'Phase 6: Python and Bun Node-Authored Sequence Tests' (Protocol in workflow.md)

## Phase 7: AVA Usage Documentation

- [ ] Task: Consult Oracle for documentation wording
    - [ ] Ask `@oracle` to review the intended README/example wording for clarity, accuracy, and developer usefulness.
    - [ ] Incorporate Oracle guidance into the final documentation wording before publishing examples.
- [ ] Task: Document how to use `@scramjet/sequence-test` with AVA
    - [ ] Add a package README section or dedicated docs page showing AVA setup for `@scramjet/sequence-test`.
    - [ ] Include a minimal one-shot AVA example using `runSequence()`.
    - [ ] Include an interactive AVA example using `createSequenceTest()` with input, output, and lifecycle assertions.
    - [ ] Include an AVA example for calling a sequence-exposed API endpoint.
    - [ ] Include an AVA example for mocked Hub calls with explicit route registration and request assertions.
    - [ ] Explain cleanup expectations, timeouts, fixture usage, and skipped runtime behavior for Python/Bun tooling.
- [ ] Task: Validate Phase 7 documentation
    - [ ] Confirm examples match the public API implemented by earlier phases.
    - [ ] Confirm examples avoid starting a real STH, Docker adapter, or Kubernetes adapter.
    - [ ] Confirm examples use existing or documented fixture helpers.
- [ ] Task: Conductor - User Manual Verification 'Phase 7: AVA Usage Documentation' (Protocol in workflow.md)

## Phase 8: Fixtures, Documentation, and Final Validation

- [ ] Task: Write tests for fixture helpers
    - [ ] Test temporary Node fixture directory creation and cleanup.
    - [ ] Test temporary Python fixture directory creation and cleanup.
    - [ ] Test temporary Bun fixture directory creation and cleanup.
- [ ] Task: Implement fixture helpers
    - [ ] Implement file-map based fixture creation.
    - [ ] Implement runtime-specific fixture helper aliases.
    - [ ] Implement cleanup integration with harness lifecycle.
- [ ] Task: Add documentation and examples
    - [ ] Add README or package docs for `@scramjet/sequence-test`.
    - [ ] Include AVA examples for one-shot sequence tests.
    - [ ] Include AVA examples for interactive tests with sequence API requests.
    - [ ] Include AVA examples for mocked Hub calls.
    - [ ] Document out-of-scope areas and runtime limitations.
- [ ] Task: Run final validation
    - [ ] Run focused `@scramjet/sequence-test` tests.
    - [ ] Run `npm run build:packages` or the narrowest sufficient package build.
    - [ ] Run `npm run lint` if required for changed files.
    - [ ] Run `npm run check:runtime-invariants` if runtime protocol surfaces changed.
    - [ ] Record skipped Docker/Kubernetes/BDD validation as out of scope unless later required.
    - [ ] Confirm no default-path imports or orchestration from @scramjet/sth, @scramjet/host, Docker adapter, Kubernetes adapter, or BDD workflows.
- [ ] Task: Final review and handoff
    - [ ] Confirm requirements and acceptance criteria are satisfied.
    - [ ] Confirm docs, tests, and implementation are aligned.
    - [ ] Prepare concise implementation summary and known limitations.
- [ ] Task: Conductor - User Manual Verification 'Phase 8: Fixtures, Documentation, and Final Validation' (Protocol in workflow.md)

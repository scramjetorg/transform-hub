# Specification: Sequence Test Harness Package

## Overview

Create a new test-runner-agnostic library package, `@scramjet/sequence-test`, that helps developers test Scramjet Transform Sequences without starting a full Scramjet Transform Hub. The package should provide a Node-based test harness that can be used from external test runners, with AVA-oriented examples matching this repository's current package testing style.

The harness should run sequence code through the existing runtime wrapper protocol where possible, mock the Hub-facing transport, allow tests to feed input and inspect output, and allow tests to call sequence-exposed API endpoints. It should support testing Node, Python, and Bun sequence behavior from Node-authored tests, while documenting current runtime limitations clearly.

## Functional Requirements

### Package and API

- Add a new workspace package under `packages/sequence-test` named `@scramjet/sequence-test`.
- Expose plain async APIs that can be used from AVA, Jest, Vitest, `node:test`, or similar external test runners.
- Provide AVA-first examples and package tests because this repository uses AVA-style TypeScript specs.
- Provide at least two primary entrypoints:
  - `createSequenceTest(options)` for interactive lifecycle tests.
  - `runSequence(options)` for one-shot sequence execution tests.
- Assertions, where provided, must throw normal JavaScript `Error` instances so external test runners can report them naturally.

### Runtime Coverage

- Support testing Node sequences first-class through the existing `runner-node` runtime behavior.
- Support Python sequence tests from Node-authored tests using the existing Python runtime wrapper where feasible.
- Support Bun sequence tests from Node-authored tests while clearly documenting that hosted Bun behavior currently delegates to Node when host channels are configured.
- Provide explicit runtime option handling, such as `runtime: "node" | "python" | "bun"`.
- Avoid claiming unsupported runtime parity. If a runtime path delegates or lacks a required channel, the harness should surface that clearly.

### Fake Host and Runtime Protocol

- Use the existing `@scramjet/runner`/runtime protocol flow as the default architecture, matching package `@scramjet/runner` behavior with added test-harness capabilities and no STH/host overlord.
- Add a default harness launch path that spawns the existing `@scramjet/runner` outer runner process and passes adapter-compatible environment variables, including `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO`, `INSTANCES_SERVER_HOST`, `INSTANCES_SERVER_PORT`, and `INSTANCE_ID`.
- Replace only the Host/instances-server side with a fake protocol endpoint for tests; the fake endpoint must not implement a parallel runtime executor path or boot-config writer for the default harness path.
- Generalize the fake instances server behavior currently present in runner tests so the harness can:
  - accept instance/channel handshakes;
  - provide `IN`, `OUT`, `LOG`, and `REQUESTS` channels where supported;
  - capture raw channel data;
  - parse monitoring frames;
  - expose channel waiters and deterministic cleanup.
- For the default launch path, expose runner-compatible adapter environment and allow `@scramjet/runner` to write boot config and choose runtime executors.
- Manage runtime process lifecycle, timeouts, cleanup, and error reporting.
- A direct runtime-wrapper launch mode may be provided only as an explicitly documented low-level/internal option; it must not be the MVP default path.

### Input, Output, Logs, and Monitoring

- Allow tests to feed sequence input as:
  - text;
  - bytes/buffers;
  - NDJSON;
  - streams where practical.
- Allow tests to inspect output as:
  - raw bytes;
  - text;
  - lines;
  - NDJSON.
- Capture logs emitted by the sequence runtime.
- Capture and expose monitoring frames, including lifecycle completion/stopped/error states.
- Provide wait helpers such as `waitForCompletion()` and minimal assertion helpers such as `assert.completed()` and `assert.noRuntimeErrors()`.

### Sequence API Requests

- Allow tests to make HTTP-like requests to API endpoints exposed by a running sequence.
- For Node runtime, discover exposed API host/port from runtime monitoring/handshake data where available.
- Provide a small request client such as `harness.request.get()`, `post()`, and `fetch()`.
- This should test direct sequence API behavior, not full Hub forwarding behavior.

### Mocked Hub Requests

- Mock outbound sequence calls to Hub APIs where the runtime supports `REQUESTS`/BPMux transport.
- For Node runtime, provide a mock Hub router that can:
  - register routes and responses;
  - capture method, path, headers, and body;
  - assert that expected Hub calls were made;
  - use an explicit minimal mock route table, avoiding broad STH-like emulation.
- Python and Bun Hub mocking should be supported only where their runtime path can use the same request transport through the Node-based harness/wrapper. Missing support must be documented rather than hidden.

### Fixtures

- Provide fixture helpers for creating temporary sequence directories/files from tests.
- Support Node, Python, and Bun fixture creation from Node-authored tests.
- Do not require stored-sequence packaging or tarball creation for the MVP.
- Reuse existing repository fixtures before adding new ones, especially:
  - `packages/runner-node/test/fixtures`
  - `packages/runner/test/transport/fake-instances-server.ts`
  - `packages/runner-python/tests/parity/fixtures`
  - `packages/runner-bun/test/fixtures`
- Add new fixtures only where existing fixtures do not already cover sequence API exposure or outbound Hub request mocking needs.

## Non-Functional Requirements

- Keep the harness deterministic and suitable for package-level tests.
- Prefer small focused tests and narrow validation commands.
- Preserve runtime protocol compatibility across packages.
- Avoid full Docker, Kubernetes, or BDD workflows unless later explicitly required.
- Keep implementation CommonJS/ES2019-compatible with the existing TypeScript monorepo settings.
- Use npm-based workflows in this repository.
- Ensure cleanup of child processes, sockets, temporary directories, and timers.

## Acceptance Criteria

- A new Conductor implementation plan exists for adding `@scramjet/sequence-test`.
- The planned package exposes test-runner-agnostic APIs with AVA-oriented examples.
- The planned package supports Node sequence tests with input/output, monitoring, logs, sequence API requests, fixtures, and mocked Hub calls.
- The planned package includes a path for Python and Bun sequence tests authored from Node, with limitations documented clearly.
- The plan uses existing repo integration points including `runner-node`, harness-provided runner environment, runner-managed boot-config and executor behavior, fake instances server behavior, monitoring/control frames, and REQUESTS/BPMux where available.
- The feature does not require starting a real STH, Docker adapter, or Kubernetes adapter.

## Out of Scope

- Starting a real Scramjet Transform Hub as part of the default harness.
- Testing Docker or Kubernetes adapter behavior.
- Testing stored-sequence packaging/tarball behavior in the MVP.
- Claiming full true Bun-hosted parity while hosted Bun runtime delegates to Node.
- Requiring Python outbound Hub mocking before the underlying runtime transport supports it.
- Replacing existing BDD smoke tests or runtime parity tests.

# Specification: Stabilize Host/Sequence Connectivity and Improve Verser

## Track ID

`connectivity_api_verser_20260601`

## Problem Statement

Scramjet Transform Hub depends on stable communication between the host, runner, runtime wrappers, and executing sequences. Connectivity failures or ambiguous API calling behavior can make sequence lifecycle, control calls, event flow, and monitoring difficult to debug. The `@scramjet/verser` package provides reverse server functionality used among Scramjet modules and should be reviewed and improved as part of the connectivity stabilization effort.

## Goals

- Stabilize API calling paths between host and sequences.
- Improve confidence in runner-to-host and sequence-to-host connectivity behavior.
- Clarify and harden `@scramjet/verser` behavior where it supports reverse server communication.
- Add focused tests that document connectivity expectations and prevent regressions.
- Preserve protocol compatibility across existing process, Node, Python, and related runtime surfaces.

## Non-Goals

- Redesigning the entire host API surface.
- Replacing the existing runner protocol.
- Introducing adapter-specific behavior that bypasses shared contracts.
- Running full Docker/Kubernetes BDD unless implementation changes require it.

## Affected Areas

- `packages/host/`: host lifecycle, API routing, local storage, instance control, and sequence interaction points.
- `packages/runner/`: host client, runner app context, communication utilities, and runtime transport.
- `packages/api-server/`: HTTP/API primitives used by host-facing flows.
- `packages/verser/`: reverse server client/server/connection implementation.
- `packages/types/`: shared contracts if connectivity interfaces require clarification.
- `bdd/`: smoke coverage only if behavior crosses host/runner/API boundaries.

## Expected Outcomes

- Host-to-sequence and sequence-to-host API calls have documented behavior and focused tests.
- Verser connection lifecycle is more robust and easier to reason about.
- Errors include actionable context for connection setup, request forwarding, teardown, and unexpected disconnection.
- Existing Node/Python/runtime behavior remains compatible.
- Validation guidance is documented in the implementation plan.

## Acceptance Criteria

- Connectivity behavior is covered by package-level tests in the affected packages.
- Verser improvements include tests for connection lifecycle, request routing, error propagation, and cleanup where applicable.
- Any changed public contracts are reflected in `packages/types` and documentation.
- `npm run build:packages` succeeds or any skipped validation is explicitly documented.
- Relevant package tests pass for changed areas.
- The phase completion verification tasks in `plan.md` are completed before implementation moves to later phases.

## Risks

- Existing behavior may be relied on implicitly by runtime wrappers or adapters.
- Connectivity bugs may be timing-sensitive and require deterministic test harnesses.
- Verser changes can affect multiple modules if reverse server semantics shift.
- Broad BDD validation may require built artifacts or Docker dependencies.

## Validation Strategy

- Start with package-level tests for `verser`, `runner`, `host`, and `api-server` as needed.
- Run `npm run build:packages` after interface or cross-package changes.
- Run `npm run check:runtime-invariants` for runtime protocol-sensitive changes.
- Use BDD smoke tests only when host/runner/sequence interaction changes cross package boundaries.

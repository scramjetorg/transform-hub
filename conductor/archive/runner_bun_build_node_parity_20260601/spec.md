# Specification: Runner Bun Build Alignment and Node API Parity

## Overview

This track addresses follow-up fixes for `@scramjet/runner-bun` after review learnings from the Python runner work. The focus is twofold: first, align Bun runner package build commands with the repository's general package build setup so the package builds correctly in workspace and distribution flows; second, verify and improve Bun runner parity with the Node runner for serving APIs and calling host endpoints.

## Track Type

Chore / stabilization with bug-fix potential.

## Context

Scramjet Transform Hub uses `packages/runner` as the outer launcher and delegates sequence execution to runtime wrappers such as Node, Python, and Bun. The Python runner follow-up revealed package build command alignment issues that were fixed on that branch. Since `runner-bun` was added afterward, this track should inspect whether the same class of build issues exists for Bun and resolve them.

The Bun runner should also preserve runtime protocol compatibility with Node for host/sequence API behavior. When a Bun sequence is executed through the hub, API serving and host endpoint calls should behave consistently with equivalent Node sequence behavior unless an intentional difference is documented.

## Functional Requirements

### Build Command Alignment

- Audit `packages/runner-bun/package.json`, TypeScript configs, Docker build scripts, and workspace build behavior.
- Compare Bun runner build scripts with the corrected Python runner package pattern and the general repository package build conventions.
- Fix any Bun runner build scripts that do not build correctly or do not integrate with the repository's package build pipeline.
- Ensure Bun runner distribution output is compatible with the outer runner's runtime wrapper resolution.

### Node API Parity

- Identify the Node runner behavior for sequence API serving and host endpoint calls that Bun should match.
- Add or update tests proving Bun runner parity for:
  - boot-config driven runtime metadata;
  - serving sequence API endpoints where supported by the Node wrapper;
  - calling host endpoints through the expected AppContext/API client flow;
  - avoiding reliance on inherited legacy runtime metadata environment variables.
- Fix Bun runner implementation gaps found by the parity tests.
- Document any intentional Bun limitations or differences.

### Review-Theme Follow-Up

- Apply the relevant review themes inferred from the Python runner work:
  - package scripts must match repo build expectations;
  - boot config is the source of runtime metadata;
  - runtime behavior should preserve shared protocol semantics;
  - tests should prevent generated fixture/output residue where practical.

## Non-Functional Requirements

- Preserve compatibility with existing Node and Python runtime wrapper behavior.
- Prefer focused package tests before broad BDD tests.
- Keep implementation changes minimal and protocol-oriented.
- Use `npm` for repository commands.
- Avoid full Docker validation unless build or runtime changes specifically require it.

## Acceptance Criteria

- `packages/runner-bun` build commands are aligned with repository package build conventions and execute successfully in the expected workspace flow.
- Bun runner tests cover Node parity for API serving and host endpoint calls, or document any validated reason a parity case is not applicable.
- Bun runtime metadata comes from boot config and not inherited `SEQUENCE_PATH`, `SEQUENCE_INFO`, or `RUNNER_CONNECT_INFO`.
- Protocol-focused validation is included, including runtime invariant checks when runner protocol behavior is affected.
- Relevant full smoke validation is planned for host/runner/sequence API behavior.
- Documentation is updated if build, runtime, dependency bundling, or parity expectations change.

## Out of Scope

- Reworking the overall runner protocol.
- Replacing the Node runtime wrapper implementation.
- Adding a Bun-specific dependency installation pipeline during runtime startup.
- Broad Docker/Kubernetes refactors unrelated to Bun runner build and Node parity.
- Fixing unrelated Python runner issues unless required to understand or validate Bun parity.

# Specification: verser2 rollout

## Overview

Replace Scramjet Transform Hub connectivity with `verser2` across Manager/MultiManager, STH, global runner, and stack-specific Node/Python/Bun runtime paths. The rollout should migrate the repository away from old `@scramjet/verser`, raw runner socket channels, and `@scramjet/bpmux`, using TLS HTTP/2 `verser2` routing and streaming semantics as the new connectivity substrate.

The track is a full rollout plan with Manager/MultiManager migration first, followed by runner transport and runtime migration. Manual verification must be limited to four phase gates, including final verification, with automated reviews and targeted tests between subphases.

## Goals

- Replace STH ⇄ Manager/MultiManager old `@scramjet/verser` connectivity with `verser2`.
- Replace runner raw socket channel and BPMux request transport with `verser2`.
- Clarify the split between the global runner connection and stack-specific runtime runners.
- Support Node, Python, and Bun runtime paths over `verser2`.
- Assume Python `verser2` Broker/request support is available and use it for Python sequence → STH API access.
- Add TLS/CA/certificate provisioning as a first-class part of the solution.
- Ensure runners receive their own certificates during startup.
- Remove `@scramjet/bpmux` from the repository because it will not be used going forward.
- Remove old `@scramjet/verser` and `packages/verser` from active connectivity paths after migration.
- Add targeted hub tests and local package tests to guard the rewrite.
- Identify any required upstream `verser2` changes early and pause STH implementation when an issue is better fixed in `signicode/verser2`.

## Functional Requirements

### Architecture and responsibilities

- Define a final `verser2` architecture for:
  - Manager/MultiManager ⇄ STH;
  - STH ⇄ global runner;
  - global runner ⇄ stack-specific runtime wrapper;
  - STH ⇄ sequence exposed API;
  - sequence → STH API.
- The global runner connection, owned by `packages/runner`, must handle process lifecycle, certificates, runner startup, reconnect/disconnect, and global streams such as stdio, control, and monitoring.
- Stack-specific runners, owned by `packages/runner-node`, `packages/runner-python`, and `packages/runner-bun`, must handle runtime-specific context, local API exposure, and runtime-native sequence → STH API access.
- Feature flags may be used only as temporary migration aids and must not become the final architecture.

### Route and identity model

- Define deterministic route names, including:
  - `manager.<managerId>.scramjet.internal`;
  - `multimanager.<multiManagerId>.scramjet.internal`;
  - `sth.<sthId>.scramjet.internal`;
  - `runner.<instanceId>.scramjet.internal`;
  - `sequence.<instanceId>.scramjet.internal`.
- Define certificate identity and SAN conventions for Manager, STH, runner, and sequence routes.

### TLS and certificate provisioning

- Define Manager/MultiManager CA behavior for platform-connected mode.
- Define STH local or delegated CA behavior for standalone and runner certificate issuance.
- Define per-runner certificate generation, delivery, rotation, and cleanup.
- Define process, Docker, and Kubernetes adapter cert injection behavior.
- Enforce Node >=20 for Node-based STH and runner components.

### Manager/STH migration

- Migrate old-verser code in:
  - `packages/host/src/lib/cpm-connector.ts`;
  - `packages/manager/src/lib/manager.ts`;
  - `packages/manager/src/lib/sth-controller.ts`;
  - `packages/multi-manager/src/lib/multi-manager.ts`;
  - `packages/multi-manager/src/lib/multi-host-controller.ts`;
  - `packages/types/src/manager/sth-connection-store.ts`.
- Replace Manager → STH request forwarding with `verser2` Broker/request behavior.
- Replace STH → Manager request forwarding with `verser2`.
- Migrate platform, log, audit, and topic streams to explicit `verser2` stream semantics.

### Runner transport migration

- Introduce transport abstractions that decouple host instance lifecycle from raw sockets and BPMux.
- Migrate global runner control, stdin, stdout, stderr, monitoring, input, output, and log streams to `verser2`.
- Replace BPMux-backed HostClient behavior in runner and runtime paths.
- Keep legacy implementations only while needed during migration.

### Runtime migration

- Node runtime must use `verser2` for `context.hub` and non-listening `context.api` exposure.
- Python runtime must use Python `verser2` Guest and Broker/request APIs for sequence API exposure and sequence → STH API calls.
- Bun runtime must use Bun `verser2` Guest and Broker/fetch APIs for sequence API exposure and sequence → STH API calls.
- Runtime behavior must remain protocol-compatible from the user perspective.

### Upstream verser2 feedback loop

- During implementation, if an issue appears better solved in `signicode/verser2` than in Transform Hub integration code, the implementation must halt at the current subtask.
- The agent must provide a concise upstream change report covering:
  - observed Transform Hub use case;
  - failing or missing `verser2` behavior;
  - affected `verser2` package/API;
  - minimal desired change;
  - blocking impact on this rollout;
  - temporary workaround, if any, and why it is or is not acceptable.
- Transform Hub should not add brittle local workarounds for problems that belong in `verser2` unless explicitly approved.
- Once the upstream `verser2` change is available, the rollout should resume with targeted package tests proving the integration behavior.

### Testing and validation

- Add local package tests for Manager, MultiManager, Host, Runner, runner-node, runner-python, runner-bun, API server, and shared types where affected.
- Add targeted hub tests covering Manager/STH connectivity, runner startup/lifecycle, Node/Python/Bun API calls, streaming, binary payloads, reconnect, disconnect, route unavailable, and certificate rejection.
- Add static checks or invariant checks proving old `@scramjet/bpmux` and `@scramjet/verser` imports/dependencies are removed in the final phase.
- Use automated reviews between subphases and keep manual verification to four gates.

## Non-Functional Requirements

- Preserve streaming and backpressure semantics; avoid mandatory full buffering for large bodies.
- Preserve runtime parity across Node, Python, and Bun.
- Maintain security boundaries for TLS, CA trust, and per-runner identity.
- Keep migration steps reviewable and test-conscious.
- Avoid full Docker/Kubernetes BDD unless a phase specifically reaches adapter certificate injection or deployment-sensitive behavior.
- Prefer upstream `verser2` fixes over Transform Hub-specific patches when the missing behavior is generic transport, TLS, routing, Broker, Guest, or streaming functionality.

## Acceptance Criteria

- Four-phase plan exists with no more than four manual verification tasks.
- Manager/MultiManager ⇄ STH connectivity is planned for `verser2` and old-verser removal.
- Global runner and stack-specific runner responsibilities are explicit.
- Node, Python, and Bun runtime migration plans are included.
- TLS/CA/certificate provisioning is included for process, Docker, and Kubernetes adapters.
- Targeted hub and local package tests are explicitly required.
- Plan includes a halt-and-report workflow for upstream `verser2` issues.
- Final phase removes active `@scramjet/bpmux`, old `@scramjet/verser`, and legacy runner socket transport usage.

## Out of Scope

- HTTP/3 implementation.
- Permanent feature flag architecture.
- Keeping BPMux for new or migrated connectivity paths.
- Keeping old `@scramjet/verser` as a long-term compatibility layer.
- Committing private registry tokens or PATs.
- Implementing code in this track-creation step.
- Modifying `/tmp/opencode/verser2` as part of this Transform Hub track unless a separate upstream verser2 task is explicitly started.

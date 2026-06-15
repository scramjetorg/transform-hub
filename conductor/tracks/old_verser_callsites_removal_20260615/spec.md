# Specification: Remove Legacy Old-Verser Active Callsites

## Overview

Remove all active runtime callsites, configuration surfaces, tests, and active package dependencies for the legacy `@scramjet/verser` transport and its BPMux-backed active usage. After this track, verser2 is the only supported Manager/STH connectivity implementation in active Host, Manager, and MultiManager runtime code. Legacy `migrationMode`, `dual`, and `legacy` branching must be removed from active configuration and runtime paths rather than retained as compatibility switches.

The standalone `packages/verser` package must remain in the workspace and builds for external users. Its own source, tests, package metadata, and dependency on `@scramjet/bpmux` are intentionally retained. The local `packages/bpmux` workspace also remains because old verser depends on it. Active Host/Manager/MultiManager/types/config code must not depend on either old verser or BPMux.

## Track Type

Chore / Refactor

## Functional Requirements

1. Remove active old-verser usage from STH/Host outbound Manager connectivity.
2. Remove active old-verser usage from Manager STH connection handling and STH forwarding.
3. Remove active old-verser usage from MultiManager connection handling, including the old `Verser` server listener and legacy MultiHost path.
4. Remove shared type dependencies on `@scramjet/verser`, including public interfaces exposing `VerserConnection`.
5. Remove configuration fields and descriptors that allow selecting old-verser behavior, including `migrationMode`, `legacy`, and `dual` transport branches.
6. Make verser2 connectivity unconditional in active Manager/STH/MultiManager runtime code, subject only to valid verser2 transport configuration and startup requirements.
7. Remove active package dependencies on `@scramjet/verser` and `@scramjet/bpmux` outside the standalone old-verser/BPMux packages.
8. Clean up tests that model or preserve active old-verser/BPMux behavior; do not leave active tests proving old-verser compatibility outside `packages/verser`.
9. Add or update transient invariant/static checks while removing active old-verser/BPMux callsites, then remove any transient removal-only invariant/doc-test scaffolding at the end once normal dependency, build, and architecture checks enforce the final state.
10. Update Conductor rollout notes or related documentation where behavior changes, then remove obsolete documentation that exists only to describe old-verser compatibility.

## Non-Functional Requirements

1. Keep changes incremental and reviewable by package or closely related package group.
2. Begin each implementation phase with a targeted inventory of remaining old-verser/BPMux code, tests, config, package metadata, and docs for that phase scope.
3. Preserve verser2 topology invariants: `Runner / Stack-Runner -> STH-local verser2 Host -> STH -> Manager/MultiManager`.
4. Do not introduce direct `Runner -> Manager/MultiManager` connectivity.
5. Do not weaken TLS, trust, CA bundle, or private-key handling introduced by the verser2 rollout.
6. Preserve `packages/verser` and `packages/bpmux` as standalone workspace packages that still build/test.
7. Use npm commands and existing AVA/package scripts; do not use hard-coded AVA CLI paths.
8. Keep BDD normal validation excluding long/stress/performance/compatibility/infrastructure tests unless explicitly required.

## Acceptance Criteria

1. No active source package outside `packages/verser` imports `@scramjet/verser`, references old `VerserConnection`, constructs `VerserClient`, or constructs `new Verser(...)`.
2. No active source package outside `packages/verser` and `packages/bpmux` imports or depends on `@scramjet/bpmux`.
3. Host `CPMConnector` no longer constructs or references `VerserClient` or `VerserClientConnection`.
4. Manager no longer accepts `VerserConnection` through active STH connection APIs, and forwarding to STH uses verser2 broker transport only.
5. `STHController` no longer stores or branches on `verserConnection`; it is constructed around verser2 route metadata and broker transport only.
6. MultiManager no longer constructs `new Verser(...)`, installs `apiVerser` listeners, or supports legacy MultiHost old-verser connections.
7. Shared types no longer expose `VerserConnection` fields or method parameters.
8. `migrationMode`, `legacy`, and `dual` options are removed from active config schemas/descriptors/types, and tests prove old-way configuration cannot select old transport behavior.
9. Tests that only exercised active legacy old-verser behavior are deleted or rewritten to current verser2 behavior; standalone `packages/verser` and `packages/bpmux` tests remain.
10. Final validation includes a repository-wide static search proving no active old-verser/BPMux traces remain outside explicitly retained standalone package or historical/archive locations, followed by cleanup of transient old-verser-removal proof scaffolding.
11. `npm run build:packages`, `npm run check:runtime-invariants`, relevant focused package tests, standalone `packages/verser`/`packages/bpmux` tests, and relevant BDD smoke validation pass or any skipped BDD command is explicitly documented with reason.

## Out Of Scope

1. Reworking verser2 protocol internals or changing upstream `@signicode/verser2-*` APIs.
2. Adding new transport features beyond making verser2 the only active path.
3. Changing runner runtime behavior except where needed to preserve topology invariants.
4. Removing, archiving, or breaking the standalone `packages/verser` or `packages/bpmux` packages.
5. Preserving compatibility for old-verser transport selection, old MultiHost old-verser transport, or old-verser Manager/STH connection mode in active runtime packages.

## Known Callsite Areas

1. `packages/host/src/lib/cpm-connector.ts`
2. `packages/manager/src/lib/manager.ts`
3. `packages/manager/src/lib/sth-controller.ts`
4. `packages/manager/src/lib/sth-connection-store.ts`
5. `packages/multi-manager/src/lib/multi-manager.ts`
6. `packages/multi-manager/src/lib/multi-host-controller.ts`
7. `packages/multi-manager/src/lib/multi-host-controller-store.ts`
8. `packages/types/src/manager/sth-connection-store.ts`
9. Package metadata for active packages depending on `@scramjet/verser` or `@scramjet/bpmux`
10. Tests under Host, Manager, and MultiManager that still model old-verser/BPMux connections
11. Runtime invariant/static-check scripts and documentation that temporarily mention old-verser/BPMux removal

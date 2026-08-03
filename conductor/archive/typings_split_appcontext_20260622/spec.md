# Specification: Typings Split and Full Sequence AppContext Typings

## Overview

Split the current monolithic `@scramjet/types` contract surface into audience-specific packages to reduce circular dependency risk and freeze the sequence AppContext API. The new model introduces `@scramjet/runtime-types` as the low-level generic type core, `@scramjet/sequence-types` as the sequence-author-facing public API, and `@scramjet/api-types` as the API/CLI/user contract package. The existing `@scramjet/types` package remains available for compatibility, is marked deprecated, and is covered by compatibility tests, but current repository source must migrate away from importing it.

The sequence-facing AppContext API is the surface being frozen. The old `@scramjet/types` compatibility package is not frozen: it may be extended when new split-package types are introduced so external compatibility remains intact. The track also reduces shared-surface complexity by moving non-shared typings and single-package exported types back to their owning packages when they are used only by direct dependents.

The track stabilizes `@scramjet/sequence-test` as a supported harness and uses it as the drop-in replacement for old downloaded/refapp sequence package tests. The goal is to freeze and validate the sequence AppContext API through focused package tests and full BDD coverage using the real host/process adapter path.

## Functional Requirements

### Type package split

1. Create `@scramjet/runtime-types` as the generic low-level type package.
   - Own the generic `BaseAppContext` type.
   - Own runtime-neutral primitives required by AppContext and sequence/runtime execution contracts.
   - Must not depend on `@scramjet/rest-api2`, API clients, CLI packages, STH config packages, adapter implementations, or `@scramjet/types`.

2. Create `@scramjet/sequence-types` as the sequence-author-facing package.
   - Export the frozen sequence AppContext API using `BaseAppContext` from `@scramjet/runtime-types`.
   - Export sequence application/function types, app config, streamable utility types, logger/localStorage surface, and sequence-facing error/definition types needed by sequence implementers.
   - Provide the canonical imports sequence authors should use going forward.

3. Create `@scramjet/api-types` as the API/user contract package.
   - Export API DTOs, REST/API user-facing contracts, and client-related type contracts needed by CLI/API users and server/client implementations.
   - Export strict REST API v2 AppContext aliases using API-owned client contracts.
   - The generic `BaseAppContext` must remain independent from REST API v2; strict v2 binding belongs in `api-types`, not `runtime-types`.

4. Preserve and deprecate `@scramjet/types` compatibility.
   - Keep the existing package available for external compatibility.
   - Preserve existing `@scramjet/types` package/module/type-resolution behavior for external consumers; deprecation must not make existing imports resolve differently or disappear.
   - Mark it deprecated in package metadata and/or documentation.
   - Add tests proving old `@scramjet/types` exports remain compatible with the new split typings where equivalent contracts exist.
   - Add tests proving representative external-style TypeScript imports from `@scramjet/types` still resolve and type-check through the compatibility package after the split.
   - Do not treat old `@scramjet/types` as a frozen API surface; it can be extended as new split-package types are introduced for compatibility.

### Type ownership and shared-surface reduction

1. Move non-shared typings out of central shared packages and into their owning implementation package when they are only relevant to that package.
2. Move exported single-package types to their owning package when they are used only by direct dependents and do not need to be shared globally.
3. Keep genuinely shared, protocol-neutral contracts in the appropriate shared package (`runtime-types`, `sequence-types`, or `api-types`).
4. Leave old `@scramjet/types` compatibility exports intact even when canonical ownership moves elsewhere.
5. Document intentional exceptions where a type remains shared despite currently narrow usage because it is part of a public/protocol contract.

### Repository migration and dependency enforcement

1. Migrate current repository source imports away from `@scramjet/types` to the appropriate new package or owning local package.
2. Add an enforcement test/check that fails when source files import `@scramjet/types`, except for the compatibility package itself, package metadata, compatibility tests, or any explicitly justified non-source references.
3. Prevent dependency cycles by adding package-level checks that verify:
   - `runtime-types` does not depend on `rest-api2`, `api-types`, `sequence-types`, or `types`.
   - `sequence-types` depends only on allowed low-level packages such as `runtime-types` and protocol symbols as needed.
   - `api-types` may depend on `runtime-types` but must not create a cycle with API implementation packages.

### AppContext API freeze

1. Define `BaseAppContext` as the generic core AppContext contract.
2. Export sequence-facing AppContext names from `@scramjet/sequence-types` without coupling the generic contract to REST API v2 implementation packages.
3. Export API-specific strict AppContext aliases from `@scramjet/api-types`.
4. Update `runner` and `runner-node` to implement/use the new split typings while preserving runtime behavior.
5. Existing AppContext capabilities must remain covered:
   - `config`
   - `instanceId`
   - `logger`
   - `keepAlive`, `end`, `destroy`
   - stop/kill/monitoring handlers
   - `emit`, `emitToSpace`, event handling
   - `localStorage`
   - `api.use` exposed endpoints
   - legacy `hub`/`space` access where currently supported
   - v2 `hubClient()`/`spaceClient()` access through API-specific aliases where applicable

### Stable sequence-test package

1. Promote `@scramjet/sequence-test` from experimental/in-progress to supported harness status for the scoped sequence fixture use cases.
2. Update its package metadata, codemap/status documentation, public exports, and tests accordingly.
3. Replace `@scramjet/types` imports in sequence-test with `sequence-types`, `runtime-types`, `api-types`, or owning local package types as appropriate.
4. Provide stable AppContext fixtures and assertions that cover the frozen sequence AppContext API.
5. Use sequence-test as the drop-in replacement for old downloaded/refapp sequence package tests where those tests exist only to validate sequence/AppContext behavior.

### BDD and CI replacement for refapp sequence tests

1. Add BDD sequence fixtures under `bdd/data/sequences` that exercise the full AppContext behavior through the actual host/process adapter and runner-node path.
2. Add Cucumber scenarios for the full AppContext path, including config, lifecycle, events, localStorage, exposed API, legacy clients, and v2 clients.
3. Replace the old fetch/download refapps testing path for these sequence/AppContext validations with stable local sequence-test/BDD fixtures.
4. Add or update npm scripts and CI wiring so refapp-style sequence validation runs as a separate explicit CI step using the new stable fixtures.
5. Retire old sequence packages from this validation path where they are superseded by the new stable fixtures.

## Non-Functional Requirements

1. Preserve runtime protocol compatibility across process, Docker, Kubernetes, Node.js, Python, and Bun surfaces unless explicitly out of scope for a fixture.
2. Keep changes incremental and test-conscious, following repository TDD expectations.
3. Avoid broad format churn while changing imports.
4. Keep package boundaries documented and discoverable.
5. Use npm, not yarn, for commands.
6. Prefer narrow validation commands first, escalating only when package or BDD boundaries require it.
7. Reduce shared type complexity rather than creating new umbrella packages with the same over-broad responsibilities.

## Acceptance Criteria

1. New packages `@scramjet/runtime-types`, `@scramjet/sequence-types`, and `@scramjet/api-types` exist with build/test scripts and package metadata.
2. `BaseAppContext` exists in `runtime-types` and has no dependency on `@scramjet/rest-api2`.
3. Sequence-facing AppContext/API exports are available from `sequence-types` and API-specific strict aliases are available from `api-types`.
4. Current repository source no longer imports `@scramjet/types`; this is enforced by an automated test/check.
5. `@scramjet/types` remains available, is marked deprecated, and compatibility tests prove equivalent old/new typings are assignable where expected.
6. `@scramjet/types` module/type resolution remains stable for representative external-style imports, proven by an automated TypeScript resolution/type-check test.
7. Old `@scramjet/types` compatibility exports can be extended as needed when new split-package canonical types are introduced.
8. Non-shared and single-package typings are moved to owning packages when practical, with documented exceptions for public/protocol contracts.
9. `runner` and `runner-node` compile and their AppContext tests pass using the new typings.
10. `@scramjet/sequence-test` is documented and tested as a supported harness and no longer depends on `@scramjet/types`.
11. Stable AppContext sequence-test fixtures cover the frozen sequence AppContext API.
12. BDD scenarios exercise the full AppContext path through a real host/process adapter run.
13. Refapp-style sequence/AppContext validation is separated into an explicit replacement CI/npm step using stable local fixtures, and old downloaded/refapp sequence packages are retired from that path.
14. Targeted affected package tests pass.
15. `npm run build:packages` passes.
16. The targeted BDD AppContext scenario passes.

## Out of Scope

1. Removing the `@scramjet/types` package entirely.
2. Breaking external consumers without compatibility exports.
3. Freezing the deprecated `@scramjet/types` compatibility package as the canonical API surface.
4. Rewriting unrelated API/runtime behavior beyond what is needed for type-package boundaries.
5. Full Docker/Kubernetes BDD validation unless required by a discovered regression.
6. Broad refapp migration unrelated to sequence/AppContext validation.
7. Changing the runtime protocol semantics.

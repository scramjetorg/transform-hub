# Implementation Plan: Typings Split and Full Sequence AppContext Typings

## Planning Notes

- Branch creation happens during implementation execution, not during planning or track creation.
- When implementation starts, create the implementation branch with name `conductor/typings_split_appcontext_20260622` or a sanitized equivalent.
- Do not make granular start-marker commits or open a PR early during planning or track creation.
- Perform all implementation work on the implementation branch and defer commits/PR creation to Branching Policy finalization: one final commit, then a PR targeting the captured base branch.
- Use OMO Slim specialists for bounded work: `explorer` for inventory, `fixer` for implementation/tests, `oracle` for review, `librarian` for external documentation only if needed, and `designer` only if UI/UX unexpectedly appears.
- Automatic supervision means routine phases do not pause for user approval; stop only for safety, ambiguity, exception-policy, or branching-policy requirements.

## Phase 1: Implementation Branch, Inventory, and Red-State Boundary Tests

- [ ] Task: Start implementation branch according to Branching Policy
    - [ ] Capture the current branch as the PR base branch.
    - [ ] Check for dirty worktree, non-main base, missing upstream, unpushed commits, and behind/diverged base; stop only if Branching Policy requires confirmation.
    - [ ] Create implementation branch `conductor/typings_split_appcontext_20260622` or sanitized equivalent from current HEAD.
    - [ ] Record the base branch and implementation branch in this plan.
- [ ] Task: Delegate type ownership and import inventory to `explorer`
    - [ ] Read package codemaps for `packages/types`, `packages/rest-api2`, `packages/runner`, `packages/runner-node`, `packages/sequence-test`, `bdd`, and relevant script/CI locations.
    - [ ] Inventory current `@scramjet/types` imports grouped by intended destination: `runtime-types`, `sequence-types`, `api-types`, owning local package, or compatibility-only.
    - [ ] Identify non-shared and single-package exported types that should move to owning packages.
    - [ ] Identify genuinely shared/protocol/public contracts that should stay in split shared packages and document exceptions.
- [ ] Task: Add red-state boundary and compatibility tests via `fixer`
    - [ ] Add dependency-boundary tests proving `@scramjet/runtime-types` cannot depend on `@scramjet/rest-api2`, `@scramjet/api-types`, `@scramjet/sequence-types`, or `@scramjet/types`.
    - [ ] Add source import enforcement test/check that fails on source imports from `@scramjet/types`, except compatibility package files, package metadata, compatibility tests, and documented non-source references.
    - [ ] Add compatibility type tests proving old `@scramjet/types` AppContext/application exports are assignable to equivalent new split typings where applicable.
    - [ ] Add a TypeScript resolution/type-check test proving representative external-style imports from `@scramjet/types` still resolve through the compatibility package after the split.
    - [ ] Add initial type tests for `BaseAppContext`, sequence-facing AppContext exports, and API-specific strict AppContext aliases.
- [ ] Task: Add red-state sequence-test and BDD acceptance definitions via `fixer`
    - [ ] Add or update `@scramjet/sequence-test` tests that import only the new split packages or local owning package types.
    - [ ] Add fixture/type tests proving supported AppContext fixture APIs compile without `@scramjet/types`.
    - [ ] Add Cucumber feature/scenario skeletons for full sequence AppContext behavior through host/process adapter and runner-node path.
    - [ ] Add or sketch fixture package(s) under `bdd/data/sequences` for config, lifecycle, events, localStorage, exposed API, legacy clients, and v2 clients.
- [ ] Task: Validate Phase 1 red state
    - [ ] Run the narrowest relevant checks to confirm new boundary/type tests fail for expected missing-package/import reasons.
    - [ ] Run the narrowest relevant `sequence-test` test selection to confirm fixture stability tests fail for expected reasons.
    - [ ] Record expected failures and classify unexpected failures using workflow failure-recovery rules.
- [ ] Task: Request `oracle` review of Phase 1
    - [ ] Review inventory completeness, boundary-test design, red-state quality, and unresolved risks.
    - [ ] Incorporate or explicitly defer review findings in this plan before continuing.
- [ ] Task: Conductor - Phase Completion 'Phase 1: Implementation Branch, Inventory, and Red-State Boundary Tests' (Protocol in workflow.md)

## Phase 2: Split Type Package Scaffolding and Compatibility Surface

- [ ] Task: Scaffold `@scramjet/runtime-types` via `fixer`
    - [ ] Create package metadata, TypeScript configs, build/test scripts, workspace wiring, and package index.
    - [ ] Move or introduce `BaseAppContext` and runtime-neutral AppContext primitives.
    - [ ] Move runtime-neutral utility, logger/localStorage, app config, error, streamable, and function-definition types required by AppContext without pulling API implementation dependencies.
    - [ ] Add package tests proving runtime-types has no forbidden dependencies.
- [ ] Task: Scaffold `@scramjet/sequence-types` via `fixer`
    - [ ] Create package metadata, TypeScript configs, build/test scripts, workspace wiring, and package index.
    - [ ] Export frozen sequence-facing AppContext names backed by `BaseAppContext`.
    - [ ] Export sequence application/function types and canonical sequence-author imports.
    - [ ] Add package tests for sequence-author import examples and AppContext API freeze expectations.
- [ ] Task: Scaffold `@scramjet/api-types` via `fixer`
    - [ ] Create package metadata, TypeScript configs, build/test scripts, workspace wiring, and package index.
    - [ ] Move or introduce API DTOs, API/client type contracts, REST/API user-facing contracts, and strict AppContext aliases.
    - [ ] Ensure API aliases can use REST API v2 client contract types without making `BaseAppContext` depend on `rest-api2`.
    - [ ] Add package tests for strict v2 AppContext aliases.
- [ ] Task: Update `@scramjet/types` compatibility package via `fixer`
    - [ ] Mark `@scramjet/types` deprecated in package metadata and/or docs while preserving external compatibility.
    - [ ] Preserve existing package/module/type-resolution behavior for external `@scramjet/types` imports.
    - [ ] Re-export or bridge new split-package canonical types where applicable.
    - [ ] Extend compatibility exports where needed for new canonical split types.
    - [ ] Add compatibility tests proving old and new equivalent typings are assignable.
    - [ ] Add or keep automated TypeScript tests that fail if representative `@scramjet/types` imports stop resolving.
    - [ ] Document that old compatibility typings are not frozen and may be extended.
- [ ] Task: Validate Phase 2 packages
    - [ ] Run targeted tests for `runtime-types`, `sequence-types`, `api-types`, and `types` compatibility.
    - [ ] Run the `@scramjet/types` TypeScript resolution/type-check compatibility test.
    - [ ] Run targeted TypeScript builds for the new packages.
    - [ ] Record dependency-boundary and compatibility-test results.
- [ ] Task: Request `oracle` review of Phase 2
    - [ ] Review package boundaries, compatibility strategy, dependency risks, and public API freeze implications.
    - [ ] Incorporate or explicitly defer review findings before continuing.
- [ ] Task: Conductor - Phase Completion 'Phase 2: Split Type Package Scaffolding and Compatibility Surface' (Protocol in workflow.md)

## Phase 3: Repository Import Migration and Type Ownership Reduction

- [ ] Task: Migrate repository source imports via bounded `fixer` lanes
    - [ ] Update sequence-facing packages and fixtures to import from `@scramjet/sequence-types`.
    - [ ] Update runtime implementation packages (`runner`, `runner-node`, runtime wrappers where applicable) to import generic/runtime contracts from `@scramjet/runtime-types`.
    - [ ] Update API/client/server/CLI packages to import API contracts from `@scramjet/api-types` or local owning packages.
    - [ ] Update adapter, host, manager, config, and utility packages to use split packages or local owning types based on the Phase 1 inventory.
- [ ] Task: Move non-shared and single-package typings to owning packages via `fixer`
    - [ ] Move types used only by one package or direct dependents into that owning package.
    - [ ] Update direct dependents to import from the owning package when appropriate.
    - [ ] Keep old `@scramjet/types` compatibility exports intact or bridged.
    - [ ] Document intentional exceptions for public/protocol contracts that remain shared.
- [ ] Task: Update package dependencies and build ordering via `fixer`
    - [ ] Add new package dependencies to affected `package.json` files.
    - [ ] Remove obsolete `@scramjet/types` dependencies from repository packages that no longer use it.
    - [ ] Update `package-lock.json` via npm when dependency metadata changes.
    - [ ] Verify workspace build order supports new package dependencies.
- [ ] Task: Update AppContext implementations via `fixer`
    - [ ] Update `packages/runner/src/runner-app-context.ts` to implement/use the new AppContext typing model.
    - [ ] Update `packages/runner-node/src/runner-app-context.ts` and context construction typing.
    - [ ] Preserve runtime behavior for lifecycle, events, storage, legacy hub/space clients, API exposure, and v2 client access.
    - [ ] Update AppContext parity and v2 client tests to use the new split packages.
- [ ] Task: Enforce no internal `@scramjet/types` source imports
    - [ ] Run the source import enforcement test/check.
    - [ ] Remove or justify remaining matches.
    - [ ] Keep allowed compatibility and metadata references documented.
- [ ] Task: Validate Phase 3 migration
    - [ ] Run targeted tests for affected migrated packages.
    - [ ] Run import enforcement and dependency-boundary checks.
    - [ ] Run a targeted package build for migrated package groups where feasible.
- [ ] Task: Request `oracle` review of Phase 3
    - [ ] Review migration completeness, type ownership decisions, dependency churn, and AppContext behavior preservation.
    - [ ] Incorporate or explicitly defer review findings before continuing.
- [ ] Task: Conductor - Phase Completion 'Phase 3: Repository Import Migration and Type Ownership Reduction' (Protocol in workflow.md)

## Phase 4: Stabilize `@scramjet/sequence-test` and Replace Refapp Sequence Validation

- [ ] Task: Promote sequence-test to supported harness status via `fixer`
    - [ ] Update `packages/sequence-test/package.json` description and package docs/codemap status from experimental to supported for scoped fixture/harness usage.
    - [ ] Define and document the supported public exports used for AppContext fixture validation.
    - [ ] Remove `@scramjet/types` dependency and replace imports with split packages or owning local types.
- [ ] Task: Strengthen sequence-test AppContext fixtures via `fixer`
    - [ ] Update existing AppContext, lifecycle, event, localStorage, exposed API, v2 client, ordered behavior, and stream fixtures to import canonical sequence typings.
    - [ ] Add compile/runtime tests that prove the frozen sequence AppContext API remains stable.
    - [ ] Add assertions that sequence-test fixtures do not require old refapp/downloaded sequence packages.
- [ ] Task: Replace old refapp sequence package validation path via `fixer`
    - [ ] Identify old downloaded/refapp sequence packages used only to validate sequence/AppContext behavior.
    - [ ] Retire those packages from this validation path without removing unrelated refapp coverage.
    - [ ] Add a replacement npm script for stable local sequence/AppContext fixture validation.
    - [ ] Replace the old fetch/download sequence validation step with the new explicit fixture validation step.
- [ ] Task: Update CI wiring for replacement validation via `fixer`
    - [ ] Locate relevant CI workflow/script entries for refapp fetch/test behavior.
    - [ ] Add the new separate CI step for replacement fixture validation.
    - [ ] Ensure package tests, BDD tests, and replacement sequence fixture tests remain separate steps.
    - [ ] Document any CI changes in project docs or package docs when user-facing.
- [ ] Task: Validate Phase 4 sequence-test and replacement scripts
    - [ ] Run `@scramjet/sequence-test` package tests.
    - [ ] Run the new replacement npm script locally.
    - [ ] Confirm old downloaded/refapp fetch is no longer required for sequence/AppContext validation.
- [ ] Task: Request `oracle` review of Phase 4
    - [ ] Review sequence-test support boundaries, replacement validation coverage, CI-step separation, and remaining risks.
    - [ ] Incorporate or explicitly defer review findings before continuing.
- [ ] Task: Conductor - Phase Completion 'Phase 4: Stabilize `@scramjet/sequence-test` and Replace Refapp Sequence Validation' (Protocol in workflow.md)

## Phase 5: Full AppContext BDD Fixture Coverage

- [ ] Task: Implement BDD AppContext sequence fixture(s) via `fixer`
    - [ ] Add local sequence package(s) under `bdd/data/sequences` with metadata needed for process-adapter startup.
    - [ ] Implement fixture behavior for config, instanceId, logger, lifecycle, events, localStorage, exposed API, legacy hub/space clients, and v2 hub/space clients.
    - [ ] Keep fixture behavior deterministic and suitable for CI.
- [ ] Task: Implement BDD step support via `fixer`
    - [ ] Reuse existing host/process startup, instance client, stream, event, and API request steps where possible.
    - [ ] Add minimal new step definitions only for AppContext-specific assertions not already covered.
    - [ ] Keep new BDD helpers scoped and documented.
- [ ] Task: Add Cucumber scenarios via `fixer`
    - [ ] Add a feature tagged for targeted CI execution.
    - [ ] Cover full AppContext behavior through real host/process adapter and runner-node path.
    - [ ] Include assertions for v2 client paths without coupling runtime AppContext types to `rest-api2`.
- [ ] Task: Validate Phase 5 BDD
    - [ ] Run targeted BDD scenario(s) with process adapter and source/built mode appropriate for the current validation point.
    - [ ] Classify and resolve failures using workflow failure-recovery rules.
    - [ ] Record skipped Docker/Kubernetes validation if not required.
- [ ] Task: Request `oracle` review of Phase 5
    - [ ] Review BDD fixture adequacy, behavior coverage, and remaining acceptance risks.
    - [ ] Incorporate or explicitly defer review findings before continuing.
- [ ] Task: Conductor - Phase Completion 'Phase 5: Full AppContext BDD Fixture Coverage' (Protocol in workflow.md)

## Phase 6: Integration Validation, Documentation, Final Review, and Branching Finalization

- [ ] Task: Update documentation and codemaps via `fixer`
    - [ ] Update package codemaps/docs for `runtime-types`, `sequence-types`, `api-types`, `types`, and `sequence-test`.
    - [ ] Update developer-facing docs or README references for canonical sequence AppContext imports.
    - [ ] Document `@scramjet/types` deprecation and compatibility role.
    - [ ] Document the replacement sequence/AppContext validation script and CI step.
- [ ] Task: Run integration validation gates
    - [ ] Run targeted affected package tests for `runtime-types`, `sequence-types`, `api-types`, `types`, `rest-api2`, `runner`, `runner-node`, and `sequence-test`.
    - [ ] Run source import enforcement and package dependency-boundary checks.
    - [ ] Run the replacement sequence/AppContext validation script.
    - [ ] Run targeted BDD AppContext scenario.
    - [ ] Run `npm run build:packages`.
    - [ ] Run lint or the narrowest appropriate Biome check after import churn.
- [ ] Task: Final deduplication and ownership review
    - [ ] Review changed packages for duplicated type definitions introduced during the split.
    - [ ] Move repeated or broadly reusable types to the correct split shared package.
    - [ ] Move package-local-only types back to owning packages where safe.
    - [ ] Record deferred ownership cleanup with justification.
- [ ] Task: Request `oracle` final review
    - [ ] Review final package boundaries, compatibility guarantees, sequence-test support status, BDD coverage, CI replacement, validation evidence, and maintainability.
    - [ ] Incorporate or explicitly defer final review findings.
- [ ] Task: Final Branching Policy PR preparation
    - [ ] Ensure `plan.md` validation notes are complete and no known failing tests are caused by the change.
    - [ ] Stage all track changes and create one final commit with all changes.
    - [ ] Push `conductor/typings_split_appcontext_20260622` or sanitized implementation branch.
    - [ ] Create a draft PR targeting the captured base branch using `spec.md` as the PR body.
    - [ ] Post verification results as a PR comment, not in the PR body.
    - [ ] Mark the PR ready for review only after final verification is complete.
- [ ] Task: Conductor - Phase Completion 'Phase 6: Integration Validation, Documentation, Final Review, and Branching Finalization' (Protocol in workflow.md)

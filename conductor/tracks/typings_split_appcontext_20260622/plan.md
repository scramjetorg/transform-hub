# Implementation Plan: Typings Split and Full Sequence AppContext Typings

## Phase 1: Review Surface, Inventory, and Failing Boundary Tests

- [ ] Task: Create Conductor review surface
    - [ ] Create a dedicated branch for this track from the current branch.
    - [ ] Prepare a draft PR describing the intended final state: split type packages, frozen sequence AppContext, stable sequence-test, and replacement AppContext fixture validation.
    - [ ] Record branch and PR details in this plan before implementation work proceeds.
- [ ] Task: Inventory current type ownership and import usage
    - [ ] Read relevant package codemaps for `packages/types`, `packages/rest-api2`, `packages/runner`, `packages/runner-node`, `packages/sequence-test`, `bdd`, and CI/script locations.
    - [ ] Build an inventory of current `@scramjet/types` imports grouped by intended destination: `runtime-types`, `sequence-types`, `api-types`, owning local package, or compatibility-only.
    - [ ] Identify non-shared and single-package exported types that should move to owning packages.
    - [ ] Identify genuinely shared/protocol/public contracts that should stay in split shared packages and document exceptions.
- [ ] Task: Add failing package-boundary tests first
    - [ ] Add a dependency-boundary test proving `@scramjet/runtime-types` cannot depend on `@scramjet/rest-api2`, `@scramjet/api-types`, `@scramjet/sequence-types`, or `@scramjet/types`.
    - [ ] Add a repository import enforcement test/check that fails on source imports from `@scramjet/types`, except compatibility package files, package metadata, compatibility tests, and documented non-source references.
    - [ ] Add a compatibility type test proving old `@scramjet/types` AppContext/application exports are assignable to equivalent new split typings where applicable.
    - [ ] Add initial type tests for `BaseAppContext`, sequence-facing AppContext exports, and API-specific strict AppContext aliases.
- [ ] Task: Add failing sequence-test stability tests
    - [ ] Add or update `@scramjet/sequence-test` package tests that import only the new split packages or local owning package types.
    - [ ] Add fixture/type tests proving supported AppContext fixture APIs compile without `@scramjet/types`.
    - [ ] Add tests that define the public harness exports needed by downstream BDD/refapp replacement coverage.
- [ ] Task: Add failing BDD/refapp replacement acceptance definitions
    - [ ] Add a Cucumber feature for full sequence AppContext behavior through the host/process adapter path.
    - [ ] Add or sketch fixture package(s) under `bdd/data/sequences` for config, lifecycle, events, localStorage, exposed API, legacy clients, and v2 clients.
    - [ ] Add or update npm/CI validation expectations so refapp-style sequence/AppContext validation is an explicit replacement step.
- [ ] Task: Validate Phase 1 red state
    - [ ] Run the narrowest relevant checks to confirm new boundary/type tests fail for the expected missing-package/import reasons.
    - [ ] Run the narrowest relevant `sequence-test` test selection to confirm fixture stability tests fail for expected reasons.
    - [ ] Record expected failures and classify any unexpected failures before proceeding.
    - [ ] Request Oracle review of Phase 1 inventory, boundary-test design, expected red state, and unresolved risks.
    - [ ] Incorporate or explicitly defer Oracle findings before the phase checkpoint.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Review Surface, Inventory, and Failing Boundary Tests' (Protocol in workflow.md)

## Phase 2: Create Split Type Packages and Compatibility Surface

- [ ] Task: Scaffold `@scramjet/runtime-types`
    - [ ] Create package metadata, TypeScript configs, build/test scripts, and package index.
    - [ ] Move or introduce `BaseAppContext` and runtime-neutral AppContext primitives.
    - [ ] Move runtime-neutral utility, logger/localStorage, app config, error, streamable, and function-definition types required by AppContext without pulling API implementation dependencies.
    - [ ] Add package tests proving runtime-types has no forbidden dependencies.
- [ ] Task: Scaffold `@scramjet/sequence-types`
    - [ ] Create package metadata, TypeScript configs, build/test scripts, and package index.
    - [ ] Export sequence-facing AppContext names backed by `BaseAppContext`.
    - [ ] Export sequence application/function types and canonical sequence-author imports.
    - [ ] Add package tests for sequence author import examples and AppContext API freeze expectations.
- [ ] Task: Scaffold `@scramjet/api-types`
    - [ ] Create package metadata, TypeScript configs, build/test scripts, and package index.
    - [ ] Move or introduce API DTOs, API/client type contracts, REST/API user-facing contracts, and strict AppContext aliases.
    - [ ] Ensure API aliases can use REST API v2 client contract types without making `BaseAppContext` depend on `rest-api2`.
    - [ ] Add package tests for strict v2 AppContext aliases.
- [ ] Task: Update `@scramjet/types` compatibility package
    - [ ] Mark `@scramjet/types` deprecated in package metadata and/or docs while preserving external compatibility.
    - [ ] Re-export or bridge new split-package canonical types where applicable.
    - [ ] Extend compatibility exports where needed for new canonical split types.
    - [ ] Add compatibility tests proving old and new equivalent typings are assignable.
    - [ ] Document that old compatibility typings are not frozen and may be extended.
- [ ] Task: Validate Phase 2 packages
    - [ ] Run targeted tests for `runtime-types`, `sequence-types`, `api-types`, and `types` compatibility.
    - [ ] Run targeted TypeScript builds for the new packages.
    - [ ] Record dependency-boundary and compatibility-test results.
    - [ ] Request Oracle review of Phase 2 package boundaries, compatibility strategy, and dependency risks.
    - [ ] Incorporate or explicitly defer Oracle findings before the phase checkpoint.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Create Split Type Packages and Compatibility Surface' (Protocol in workflow.md)

## Phase 3: Migrate Repository Imports and Reduce Shared Type Complexity

- [ ] Task: Migrate source imports away from `@scramjet/types`
    - [ ] Update sequence-facing packages and fixtures to import from `@scramjet/sequence-types`.
    - [ ] Update runtime implementation packages (`runner`, `runner-node`, runtime wrappers where applicable) to import generic/runtime contracts from `@scramjet/runtime-types`.
    - [ ] Update API/client/server/CLI packages to import API contracts from `@scramjet/api-types` or local owning packages.
    - [ ] Update adapter, host, manager, config, and utility packages to use split packages or local owning types based on the Phase 1 inventory.
- [ ] Task: Move non-shared and single-package typings to owning packages
    - [ ] Move types used only by one package or direct dependents into that owning package.
    - [ ] Update direct dependents to import from the owning package when appropriate.
    - [ ] Keep old `@scramjet/types` compatibility exports intact or bridged.
    - [ ] Document intentional exceptions for public/protocol contracts that remain shared.
- [ ] Task: Update package dependencies and build ordering
    - [ ] Add new package dependencies to affected `package.json` files.
    - [ ] Remove obsolete `@scramjet/types` dependencies from repo packages that no longer use it.
    - [ ] Update lockfile via npm when dependency metadata changes.
    - [ ] Verify workspace build order supports new package dependencies.
- [ ] Task: Update AppContext implementations
    - [ ] Update `packages/runner/src/runner-app-context.ts` to implement the new AppContext typing model.
    - [ ] Update `packages/runner-node/src/runner-app-context.ts` and context construction typing.
    - [ ] Preserve runtime behavior for lifecycle, events, storage, legacy hub/space clients, API exposure, and v2 client access.
    - [ ] Update AppContext parity and v2 client tests to use the new split packages.
- [ ] Task: Enforce no internal `@scramjet/types` imports
    - [ ] Run the source import enforcement test/check.
    - [ ] Remove or justify any remaining matches.
    - [ ] Keep allowed compatibility and metadata references documented.
- [ ] Task: Validate Phase 3 migration
    - [ ] Run targeted tests for affected migrated packages.
    - [ ] Run the import enforcement and dependency-boundary checks.
    - [ ] Run a targeted package build for migrated package groups where feasible.
    - [ ] Request Oracle review of Phase 3 migration completeness, type ownership decisions, and AppContext behavior preservation.
    - [ ] Incorporate or explicitly defer Oracle findings before the phase checkpoint.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Migrate Repository Imports and Reduce Shared Type Complexity' (Protocol in workflow.md)

## Phase 4: Stabilize `@scramjet/sequence-test` and Replace Refapp Sequence Validation

- [ ] Task: Promote sequence-test to supported harness status
    - [ ] Update `packages/sequence-test/package.json` description and package docs/codemap status from experimental to supported for scoped fixture/harness usage.
    - [ ] Define and document the supported public exports used for AppContext fixture validation.
    - [ ] Remove `@scramjet/types` dependency and replace imports with split packages or owning local types.
- [ ] Task: Strengthen sequence-test AppContext fixtures
    - [ ] Update existing AppContext, lifecycle, event, localStorage, exposed API, v2 client, ordered behavior, and stream fixtures to import canonical sequence typings.
    - [ ] Add compile/runtime tests that prove the frozen sequence AppContext API remains stable.
    - [ ] Add assertions that sequence-test fixtures do not require old refapp/downloaded sequence packages.
- [ ] Task: Replace old refapp sequence package validation path
    - [ ] Identify old downloaded/refapp sequence packages used only to validate sequence/AppContext behavior.
    - [ ] Retire those packages from this validation path without removing unrelated refapp coverage.
    - [ ] Add a replacement npm script for stable local sequence/AppContext fixture validation.
    - [ ] Replace the old fetch/download sequence validation step with the new explicit fixture validation step.
- [ ] Task: Update CI wiring for replacement validation
    - [ ] Locate relevant CI workflow/script entries for refapp fetch/test behavior.
    - [ ] Add the new separate CI step for the replacement fixture validation.
    - [ ] Ensure package tests, BDD tests, and replacement sequence fixture tests remain separate steps.
    - [ ] Document any CI changes in project docs or package docs when user-facing.
- [ ] Task: Validate Phase 4 sequence-test and replacement scripts
    - [ ] Run `@scramjet/sequence-test` package tests.
    - [ ] Run the new replacement npm script locally.
    - [ ] Confirm old downloaded/refapp fetch is no longer required for sequence/AppContext validation.
    - [ ] Request Oracle review of sequence-test support boundaries, replacement validation coverage, and CI-step separation.
    - [ ] Incorporate or explicitly defer Oracle findings before the phase checkpoint.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Stabilize `@scramjet/sequence-test` and Replace Refapp Sequence Validation' (Protocol in workflow.md)

## Phase 5: Full AppContext BDD Fixture Coverage

- [ ] Task: Implement BDD AppContext sequence fixture(s)
    - [ ] Add local sequence package(s) under `bdd/data/sequences` with metadata needed for process-adapter startup.
    - [ ] Implement fixture behavior for config, instanceId, logger, lifecycle, events, localStorage, exposed API, legacy hub/space clients, and v2 hub/space clients.
    - [ ] Keep fixture behavior deterministic and suitable for CI.
- [ ] Task: Implement BDD step support
    - [ ] Reuse existing host/process startup, instance client, stream, event, and API request steps where possible.
    - [ ] Add minimal new step definitions only for AppContext-specific assertions not already covered.
    - [ ] Keep new BDD helpers scoped and documented.
- [ ] Task: Add Cucumber scenarios
    - [ ] Add a feature tagged for targeted CI execution.
    - [ ] Cover full AppContext behavior through real host/process adapter and runner-node path.
    - [ ] Include assertions for v2 client paths without coupling runtime AppContext types to `rest-api2`.
- [ ] Task: Validate Phase 5 BDD
    - [ ] Run targeted BDD scenario(s) with process adapter and source/built mode appropriate for the current validation point.
    - [ ] Classify and resolve any failures using workflow failure-recovery rules.
    - [ ] Record skipped Docker/Kubernetes validation if not required.
    - [ ] Request Oracle review of BDD fixture adequacy, behavior coverage, and remaining acceptance risks.
    - [ ] Incorporate or explicitly defer Oracle findings before the phase checkpoint.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Full AppContext BDD Fixture Coverage' (Protocol in workflow.md)

## Phase 6: Integration Validation, Documentation, and Final Cleanup

- [ ] Task: Update documentation and codemaps
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
    - [ ] Record any deferred ownership cleanup with justification.
- [ ] Task: Oracle final phase work review
    - [ ] Request Oracle review of final package boundaries, compatibility guarantees, sequence-test support status, BDD coverage, CI replacement, and validation evidence.
    - [ ] Incorporate or explicitly defer Oracle findings before final manual verification.
- [ ] Task: Final track readiness
    - [ ] Ensure `plan.md` validation notes are complete.
    - [ ] Ensure no known failing tests are caused by the change.
    - [ ] Ensure PR description/checklist reflects final validation results.
    - [ ] Prepare final phase commit and push the review branch before manual verification.
- [ ] Task: Conductor - User Manual Verification 'Phase 6: Integration Validation, Documentation, and Final Cleanup' (Protocol in workflow.md)

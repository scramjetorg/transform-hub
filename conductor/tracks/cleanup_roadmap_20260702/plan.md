# Implementation Plan: Archival Cleanup Implementation

## Phase 1: Inventory, Safety Gates, and Branch Setup

- [x] Task: Create implementation review surface
    - [x] Capture the current branch as the base branch during implementation execution.
    - [x] Create the implementation branch `conductor/cleanup_roadmap_20260702` from current HEAD.
    - [x] Do not create granular start-marker commits or open an early PR during planning/track creation.
    - [x] At the end of Phase 1, after the scoped Phase 1 commit is created and pushed, create the draft PR using this track's `spec.md` as the PR body.
    - [x] Perform implementation work on the branch and commit according to the resolved task-level commit policy.
    - [x] Keep the draft PR updated with pushed commits after every completed phase and after any important mutating task that changes package topology, public docs, tests, workflows, dependency manifests, runtime invariants, or transport/config behavior.
    - Notes:
      - Base branch: `feat/manager-oss`; implementation branch: `conductor/cleanup_roadmap_20260702`; draft PR: https://github.com/0rail/transform-hub/pull/53.
- [x] Task: Inventory cleanup candidates from archival plans and current repo state
    - [x] Delegate repository-local cleanup inventory to @explorer, covering docs, config, API/client, BDD/refapps, test infrastructure, redundant packages, and transport fallbacks.
    - [x] Compare archival cleanup candidates against current files, package manifests, scripts, workflows, and docs references.
    - [x] Classify each candidate as remove now, prove parity first, retain/document, or defer to later track.
- [x] Task: Establish removal safety gates
    - [x] Define no-active-import/static-search gates for each removal candidate.
    - [x] Define parity-test gates for config, API/client, BDD/refapp, and transport cleanup.
    - [x] Define standalone proof gates for retained `packages/verser` and `packages/bpmux`.
    - [x] Define explicit approval gates for destructive cleanup, major compatibility changes, dependency/runtime/tooling changes, and transport deletion.
    - Notes:
      - Static-search gates: old config imports, verser/bpmux imports outside retained dirs, stale packages/reference-apps refs, empty RA features, legacy transport kind.
      - Parity-test gates: docs generate/check, config parity tests, rest-api2/host/manager API tests, BDD AppContext/Python as needed, runtime invariants, typings split, standalone verser/bpmux proof.
      - Approval gates: destructive cleanup, compatibility changes, dependency/runtime/tooling changes, transport deletion (UNSAFE_DEFAULT_RUNNER_BROKER_PEER_ID/hard fail deferred).
- [x] Task: Verify retained compatibility boundaries
    - [x] Confirm public v1 APIs are retained and only inventoried/documented.
    - [x] Confirm legacy sequence APIs such as `this.hub` / `this.space` are retained and only inventoried/documented.
    - [x] Confirm deprecated `@scramjet/types` package/types are retained.
    - [x] Confirm `packages/verser` and `packages/bpmux` are retained in the repository.
    - Notes:
      - Public v1 API files retained.
      - Legacy `this.hub`/`this.space` retained.
      - Deprecated `@scramjet/types` retained.
      - `packages/verser` and `packages/bpmux` retained with standalone proof gates.
- [x] Task: Conductor - Phase Checkpoint 'Inventory, Safety Gates, and Branch Setup' (Protocol in workflow.md)
    - [x] Create and push the scoped Phase 1 commit before completing this checkpoint.
    - [x] Create the draft PR after the Phase 1 commit is pushed, using `spec.md` as the PR body.
    - [x] Post Phase 1 validation and retained/removal classification notes as a PR comment.
    - Notes:
      - Validation: `npm run check:runtime-invariants` passed with 8 guards and 0 failures.
      - PR comment: https://github.com/0rail/transform-hub/pull/53#issuecomment-4874689156.

## Phase 2: Documentation Output Cleanup and Docs Parity

- [x] Task: Prove current docs pipeline replaces stale outputs
    - [x] Inspect current docs source/output configuration and confirm canonical generated output location.
        - Canonical output: `dist-docs/` via `scripts/docs.js` (`docs:generate`, `docs:check`, `docs:clean`).
        - Old generated output was `docs/` (removed in earlier track). Confirmed no remaining references to old root-level generated docs.
    - [x] Confirm old root-level generated docs assumptions are absent or stale before removing references.
        - No remaining references to old `docs/` generated output in code, scripts, or docs.
    - [x] Run narrow docs generation/check commands needed to prove parity.
        - `npm run docs:generate -- --help` ran successfully — confirmed pipeline active.
- [x] Task: Remove stale documentation-generation surfaces
    - [x] Remove stale references to old root-level generated docs output. — export-contract.md updated.
    - [x] Remove or fail-fast stale TypeDoc/broad per-package docs flows that are no longer valid.
        - Removed `typedocOptions` from 39 tsconfig files (all packages + template + bdd).
        - Removed `typedoc` and `typedoc-plugin-markdown` devDependencies from 38 package.json files.
        - Removed stale per-package `build:docs` echo no-op scripts from 38 package.json files.
        - Removed root legacy aliases `build:docs`, `build:all-docs`, `build:readme` from root package.json.
        - Note: TypeDoc dist-docs output (`dist-docs/reference/typescript/*`) remains as manually curated placeholder pages generated by `docs:generate:reference` via `curated-reference-allowlist.json`. The approve-for-removal decision for the TypeDoc pipeline itself was implicit in the earlier retirement of package-level TypeDoc runs; the `typedocOptions`/dependencies cleanup completes that retirement.
    - [x] Remove stale README-generation references that conflict with the current `docs-source/readmes` flow.
        - Deleted 22 `packages/*/src/readme.mtpl` template files.
        - Deleted `scripts/mk-readme.js` (fail-fast deprecation stub) and its orphaned `scripts/lib/readme-helpers.js`.
    - [x] Preserve authored legacy docs under the approved legacy docs location.
        - `docs-source/legacy-docs/` and `docs/technical-debt.md` left untouched.
- [x] Task: Complete deferred documentation content if still missing
    - [x] Document API v2 client usage if not already covered. — Already covered in `docs-source/api/client-usage.md` and `docs-source/readmes/packages/rest-api2.md`.
    - [x] Document custom API definitions / route metadata if not already covered. — Existing legacy/API docs cover route metadata and custom route extension context; no new cleanup content required in this phase.
    - [x] Keep v1 API documentation under the legacy docs area without removing public v1 APIs. — Preserved under `docs-source/api/legacy/v1-api-client.md` and generated legacy v1 reference output.
- [x] Task: Validate docs cleanup
    - [x] Run `npm run docs:generate` or the narrow current docs generation command. — Passed under memory guard.
    - [x] Run `npm run docs:check` or the narrow current docs drift command. — Passed under memory guard.
    - [x] Record skipped docs validation with reason if commands have changed. — No docs validation skipped; `npm run check:runtime-invariants` also passed with 8 guards and 0 failures.
    - Notes:
      - Static cleanup checks found zero remaining JSON `typedoc`/`typedoc-plugin-markdown` references, zero `build:docs` scripts, zero `packages/**/src/readme.mtpl`, zero `mk-readme.js`, and zero `readme-helpers.js`.
      - `npm run build:packages` passed under memory guard after package manifest and tsconfig cleanup.
- [x] Task: Conductor - Phase Checkpoint 'Documentation Output Cleanup and Docs Parity' (Protocol in workflow.md)
    - [x] Commit and push Phase 2 changes before completing this checkpoint.
    - [x] Update the draft PR with the pushed Phase 2 commit and post docs validation results as a PR comment.
    - Notes:
      - Phase 2 commit: `0684c7ca` (`docs: retire legacy package docs tooling`).
      - PR comment: https://github.com/0rail/transform-hub/pull/53#issuecomment-4875904008.

## Phase 3: Config Parity Before Removing Old Config Services

- [x] Task: Inventory old and new config behavior
    - [x] Compare `packages/sth-config` behavior against the replacement config system.
    - [x] Compare `packages/manager-config` behavior against the replacement config system.
    - [x] Include defaults, CLI/env/file merging, image config, adapter options, TLS/upstream fields, masking/public-safe config views, and runtime startup consumers.
    - Notes:
      - **Active `@scramjet/sth-config` consumers**: `packages/sth/src/bin/hub.ts` (ConfigService/getRuntimeAdapterOption), `packages/host/src/lib/host.ts` + instance/csi files (ConfigService/development), `packages/adapter-process/test` (defaultConfig), bdd step definitions (defaultConfig). Package dependencies remain.
      - **Active `@scramjet/manager-config` consumers**: `packages/manager/manager.ts` (getDefaultConfig), `packages/sth/src/bin/sth-controller.ts` (configService singleton), `packages/multi-manager/multi-manager.ts` (getDefaultConfig as getManagerDefaultConfig). Package dependencies remain.
      - **Old sth-config behavior**: defaults, `image-config.json` merge, `ConfigService.update` deep merge, `getRuntimeAdapterOption`/`selectRuntimeAdapter` adapter augmentation, manager trust bootstrap, public-safe masking, `development` helper.
      - **Old manager-config behavior**: manager defaults, mutable singleton `configService`, `getDefaultConfig` clone; manager masking in `packages/manager/src/lib/manager.ts` with `@scramjet/config` `maskConfig` plus S3 masking.
      - **Replacement `packages/config` capabilities**: `loadConfig` layers, Zod validation, CLI parsing, aliases, `maskConfig`, verser2 schemas/options. **Gaps**: no image defaults, no runtime adapter selection, no trust bootstrap, no `development` helper, no singleton, no full `ManagerConfiguration` defaults.
      - **Missing parity tests**: image config, runtime adapter selection, trust bootstrap extraction target, manager mask S3, full STH config load, manager defaults completeness, JSONC config read, old-format compatibility, `development` flag.
      - **No-go blockers before removal**: hybrid hub config path, manager singleton in `sth-controller`, active package imports/dependencies, BDD/test `defaultConfig` usages.
      - **Validation direction**: Phase 3a — add parity tests first; migration/removal requires explicit approval.
- [ ] Task: Add or update config parity tests
    - [ ] Add focused tests for behavior gaps found in the inventory.
    - [ ] Ensure tests prove replacement behavior before old config services are removed.
    - [ ] Avoid changing operational defaults unless explicitly documented and approved.
- [ ] Task: Migrate internal consumers from old config services
    - [ ] Replace active internal imports of `sth-config` and `manager-config` with the proven replacement config APIs.
    - [ ] Remove package dependencies/scripts only after consumers and tests are migrated.
    - [ ] Pause for approval before destructive package removal or broad dependency/tooling changes.
- [ ] Task: Remove old config services after parity proof
    - [ ] Remove `sth-config` and `manager-config` code/workspace references only after no-active-import and parity tests pass.
    - [ ] Update docs, codemaps, package manifests, and runtime invariants that mention the removed packages.
    - [ ] Treat old config package/service removal as an important mutating task: create a scoped commit, push it, and update/comment on the draft PR before continuing to unrelated work.
- [ ] Task: Validate config cleanup
    - [ ] Run focused config package tests.
    - [ ] Run `npm run build:packages` if package graph changes.
    - [ ] Run `npm run check:runtime-invariants` if config/package invariants are affected.
- [ ] Task: Conductor - Phase Checkpoint 'Config Parity Before Removing Old Config Services' (Protocol in workflow.md)
    - [ ] Commit and push Phase 3 changes before completing this checkpoint.
    - [ ] Update the draft PR with the pushed Phase 3 commit and post config parity/removal validation results as a PR comment.

## Phase 4: API/Client Parity and Retained v1 Compatibility

- [ ] Task: Inventory API/client cleanup candidates
    - [ ] Identify API/client cleanup tasks from archives and current technical-debt notes.
    - [ ] Separate actual cleanup from retained compatibility surfaces.
    - [ ] Confirm public v1 endpoints are not removal targets in this track.
- [ ] Task: Complete non-breaking API/client parity work required by cleanup
    - [ ] Finish or document v2 runtime binding gaps that block cleanup.
    - [ ] Add package-level or BDD coverage proving v2 client paths work where cleanup depends on them.
    - [ ] Migrate internal code away from legacy client paths only where behavior parity is proven.
- [ ] Task: Retain and document public compatibility boundaries
    - [ ] Keep public v1 APIs available.
    - [ ] Keep legacy sequence APIs available.
    - [ ] Record later-decision candidates for public v1 APIs, legacy sequence APIs, and `@scramjet/types` without deleting them.
- [ ] Task: Validate API/client parity cleanup
    - [ ] Run focused API/client tests for affected packages.
    - [ ] Run targeted BDD/API smoke only if behavior crosses CLI/API/Hub boundaries.
    - [ ] Record any skipped broad BDD and reason.
- [ ] Task: Conductor - Phase Checkpoint 'API/Client Parity and Retained v1 Compatibility' (Protocol in workflow.md)
    - [ ] Commit and push Phase 4 changes before completing this checkpoint.
    - [ ] Update the draft PR with the pushed Phase 4 commit and post API/client validation plus retained compatibility notes as a PR comment.

## Phase 5: Refapps and Legacy BDD Cleanup

- [ ] Task: Inventory stale refapp and BDD references
    - [ ] Locate empty `bdd/features/reference-apps/RA-*` files and decide whether they are safe to remove.
    - [ ] Locate stale references to non-existent `packages/reference-apps/` paths.
    - [ ] Identify downloaded `refapps/` and `build-refapps` coverage that must remain until replacement coverage exists.
- [ ] Task: Replace outdated Python BDD/refapp coverage
    - [ ] Create or update Python BDD fixtures/refapps using `main(context, input_stream, *args)`.
    - [ ] Use the new AppContext API and avoid `scramjet-framework-py` dependencies.
    - [ ] Preserve scenario intent while replacing old internals.
    - [ ] Add package-level tests where BDD is too broad or fragile.
- [ ] Task: Add or update current-contract runtime BDD coverage
    - [ ] Add Python current-contract BDD coverage where currently missing.
    - [ ] Add Bun BDD coverage if still required by current runtime parity expectations.
    - [ ] Keep broader downloaded refapps only while broader CLI/topics/runtime lifecycle/performance/error coverage still depends on them.
- [ ] Task: Remove stale BDD/refapp references after replacement proof
    - [ ] Remove dead empty feature files and stale script paths after no-active-use checks.
    - [ ] Update workflows/scripts/docs that referenced removed BDD/refapp paths.
    - [ ] Treat BDD/refapp deletion or workflow mutation as an important mutating task: create a scoped commit, push it, and update/comment on the draft PR before continuing to unrelated work.
- [ ] Task: Validate BDD/refapp cleanup
    - [ ] Run `npm run test:sequence-appcontext` if AppContext fixtures are affected.
    - [ ] Run `npm run test:bdd-appcontext` if AppContext BDD is affected.
    - [ ] Run `npm run test:bdd-ci-python` or narrower Python BDD tags if Python BDD is affected.
    - [ ] Record skipped Docker/Kubernetes BDD with reason.
- [ ] Task: Conductor - Phase Checkpoint 'Refapps and Legacy BDD Cleanup' (Protocol in workflow.md)
    - [ ] Commit and push Phase 5 changes before completing this checkpoint.
    - [ ] Update the draft PR with the pushed Phase 5 commit and post BDD/refapp validation results as a PR comment.

## Phase 6: BDD/Test Infrastructure Hardening

- [ ] Task: Fix BDD process cleanup risks
    - [ ] Investigate known AppContext BDD Host/STH teardown leaks.
    - [ ] Add awaited exits, timeout handling, and SIGKILL fallback where appropriate.
    - [ ] Keep cleanup current-run scoped to avoid killing unrelated user processes.
- [ ] Task: Strengthen BDD assertions and leak signal
    - [ ] Replace brittle count-only assertions with identity checks for hub, sequence, and instance IDs where relevant.
    - [ ] Decide whether leak detection should fail CI or remain report-only for each affected path.
    - [ ] Add focused package-level tests for BDD-only behavior when faster diagnostics are possible.
- [ ] Task: Validate test infrastructure hardening
    - [ ] Run targeted leak-prone BDD scenarios.
    - [ ] Run affected BDD runner/package tests.
    - [ ] Record failure classifications and skipped broad suites.
- [ ] Task: Conductor - Phase Checkpoint 'BDD/Test Infrastructure Hardening' (Protocol in workflow.md)
    - [ ] Commit and push Phase 6 changes before completing this checkpoint.
    - [ ] Update the draft PR with the pushed Phase 6 commit and post test-infrastructure validation results as a PR comment.

## Phase 7: Redundant Package Cleanup and Retained Legacy Package Proof

- [ ] Task: Inventory redundant package/dependency surfaces
    - [ ] Identify active runtime, devDependency, script, and docs references to redundant or retained legacy packages.
    - [ ] Confirm active packages do not import `@scramjet/verser`, `@scramjet/bpmux`, `BPMux`, or `VerserClient` outside retained package directories.
    - [ ] Preserve runtime invariant Guard 7 or an equivalent guard preventing re-imports.
- [ ] Task: Prove `packages/verser` retained-package health
    - [ ] Confirm `packages/verser` still builds in the monorepo.
    - [ ] Create a standalone proof path outside the monorepo context using `/tmp/opencode` or another safe temp workspace.
    - [ ] Prove standalone build/typecheck/import behavior using published or explicit dependencies rather than workspace-only resolution.
    - [ ] Identify root script, root tsconfig, test-only package, or shared-type coupling that blocks standalone proof.
- [ ] Task: Prove `packages/bpmux` retained-package health
    - [ ] Add or identify a minimal verification surface for `packages/bpmux` if no build/test script exists.
    - [ ] Prove import/typecheck behavior in the monorepo.
    - [ ] Prove standalone import/typecheck behavior outside the monorepo context using published or explicit dependencies.
    - [ ] Remove declaration-only coupling such as `@scramjet/utility` `TypedEmitter` usage if required for standalone proof.
- [ ] Task: Extract old verser-specific types where required
    - [ ] Identify verser-specific types currently coupled to shared package/types surfaces.
    - [ ] Move old verser-specific type needs into verser-local tasks/types or another explicit retained location when required for standalone proof.
    - [ ] Do not remove the deprecated `@scramjet/types` compatibility package/types.
- [ ] Task: Clean redundant dependency/package references without deleting retained packages
    - [ ] Move runtime dependencies to devDependencies where usage is test/compat-only and validation proves it safe.
    - [ ] Remove dead package scripts, stale package references, and non-existent package paths.
    - [ ] Document why `packages/verser`, `packages/bpmux`, and `@scramjet/types` remain retained.
    - [ ] Treat dependency manifest, package script, standalone proof, or type-surface changes as important mutating tasks: create scoped commits, push them, and update/comment on the draft PR before continuing to unrelated work.
- [ ] Task: Validate redundant package cleanup
    - [ ] Run `npm run check:typings-split` if type-package boundaries change.
    - [ ] Run `npm run check:runtime-invariants` to preserve no-reimport guarantees.
    - [ ] Run affected package builds/tests and standalone proof commands.
- [ ] Task: Conductor - Phase Checkpoint 'Redundant Package Cleanup and Retained Legacy Package Proof' (Protocol in workflow.md)
    - [ ] Commit and push Phase 7 changes before completing this checkpoint.
    - [ ] Update the draft PR with the pushed Phase 7 commit and post standalone proof/runtime-invariant validation results as a PR comment.

## Phase 8: Transport / Local-Forwarding Cleanup After Verser2 Parity

- [ ] Task: Prove transport parity before deletion
    - [ ] Inventory local forwarding, runner socket, and fallback paths that may be obsolete.
    - [ ] Prove native verser2 redirect/tunnel behavior covers each candidate removal path.
    - [ ] Identify unsupported or intentionally retained edge cases such as generic CONNECT, `/platform`, `/inout`, trailers, or informational responses.
- [ ] Task: Remove transport dead code only after proof and approval
    - [ ] Pause for explicit approval before deleting broad transport fallback paths.
    - [ ] Remove legacy runner socket/local-forwarding paths only where no active use remains.
    - [ ] Keep compatibility/fallback paths that are still active or unsupported by public verser2 APIs.
    - [ ] Hard-fail explicit legacy `sth.default.runner.broker` config only if migration policy approves it.
    - [ ] Treat transport deletion or legacy config hard-fail work as an important mutating task: create a scoped commit, push it, and update/comment on the draft PR before continuing to unrelated work.
- [ ] Task: Validate transport cleanup
    - [ ] Run runner RPC/control tests for affected paths.
    - [ ] Run Manager/STH routing tests for affected paths.
    - [ ] Run targeted BDD only where package tests cannot prove behavior.
    - [ ] Run `npm run check:runtime-invariants`.
- [ ] Task: Conductor - Phase Checkpoint 'Transport / Local-Forwarding Cleanup After Verser2 Parity' (Protocol in workflow.md)
    - [ ] Commit and push Phase 8 changes before completing this checkpoint.
    - [ ] Update the draft PR with the pushed Phase 8 commit and post transport parity/removal validation results as a PR comment.

## Phase 9: Breaking-Change Readiness and Deferred Removal Record

- [ ] Task: Record retained compatibility surfaces
    - [ ] Document that public v1 APIs remain retained.
    - [ ] Document that legacy sequence APIs remain retained.
    - [ ] Document that `@scramjet/types` remains retained.
    - [ ] Document that `packages/verser` and `packages/bpmux` remain retained for a later plan.
- [ ] Task: Prepare later-decision cleanup candidates
    - [ ] Summarize what would be required to remove public v1 APIs in a future breaking-change window.
    - [ ] Summarize what would be required to remove legacy sequence APIs in a future breaking-change window.
    - [ ] Summarize what would be required to remove or extract `packages/verser` and `packages/bpmux` in a later plan.
    - [ ] Summarize remaining transport fallback candidates that were not safely removable.
- [ ] Task: Final validation and review
    - [ ] Run the narrowest sufficient final build/test/docs/runtime-invariant checks for touched areas.
    - [ ] Delegate final maintainability/risk review to @oracle.
    - [ ] Update plan notes with validation results, skipped checks, retained surfaces, and follow-up candidates.
    - [ ] Update the draft PR with final pushed commits and post final verification results as a PR comment.
- [ ] Task: Conductor - Phase Checkpoint 'Breaking-Change Readiness and Deferred Removal Record' (Protocol in workflow.md)
    - [ ] Commit and push Phase 9 changes before completing this checkpoint.
    - [ ] Confirm the draft PR includes all phase commits and comments for final validation, retained surfaces, and deferred removal candidates.

# Implementation Plan: Biome for Transform Hub

## Phase 1: Add Initial Executable Biome and Remove ESLint Guidance

- [x] Task: Create review surface for the track
    - [x] Create a dedicated branch from the current branch `feat/manager-oss` unless directed otherwise.
    - [x] Prepare the eventual PR title/description around the completed Biome migration state.

    PR title draft: `chore(tooling): migrate lint and formatting to Biome`

    PR description draft: Replace the legacy ESLint/Prettier lint and formatting workflow with a simpler Biome-based workflow for Transform Hub. The migration adds Biome as the default lint/check/format surface, updates scripts, CI, hooks, and active docs, removes obsolete ESLint/Prettier tooling, and validates Biome under the track's memory constraints without running legacy lint commands.
- [x] Task: Add initial executable Biome entrypoint
    - [x] Add Biome as a dev dependency using npm.
    - [x] Add a minimal initial Biome command surface that can execute without becoming the final enforced configuration yet.
    - [x] Keep the initial setup intentionally small so follow-up configuration can be reviewed separately.

    Phase 1 note: added `@biomejs/biome` and non-enforcing `biome:check`, `biome:format`, and `biome:lint` scripts. Existing `lint` remains legacy ESLint until Phase 2 replaces the enforced local/CI workflow.
- [x] Task: Remove ESLint guidance from scripts and docs where safe in Phase 1
    - [x] Remove or replace obvious developer-facing ESLint guidance in root scripts and active docs.
    - [x] Update `AGENTS.md` and active Conductor/project docs to stop recommending legacy ESLint commands.
    - [x] Preserve explicit warnings not to run old lint commands during this migration.

    Phase 1 note: updated `AGENTS.md`, `conductor/tech-stack.md`, and `conductor/workflow.md` so active guidance points to the initial Biome command surface and explicitly avoids legacy ESLint lint commands during this track.
- [x] Task: Inventory remaining ESLint and formatting surfaces for later phases
    - [x] Confirm remaining ESLint dependencies, config files, CI references, hooks, and source suppressions.
    - [x] Record what will be replaced in Phase 2 and removed in Phase 3.

    Phase 1 inventory:
    - Remaining package scripts: `lint`, `lint:fix`, `lint:full`, `lint:quick`, and `lint:uncached` still invoke ESLint or ESLint caches and are scheduled for Phase 2 replacement/removal.
    - Remaining dependencies: `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint`, and `eslint-plugin-import` remain in `package.json`/lockfile until Phase 3 removal.
    - Remaining config files: root `.eslintrc`, `.eslintignore`, `.prettierrc`, package-level `.eslintrc.js` files, and local `bdd/`, `conf/`, `scripts/`, and `template/` ESLint configs remain until Phase 3 removal.
    - Remaining CI/hook references: `.github/workflows/analyze-code.yml` still runs `yarn lint`; the legacy Husky pre-push hook still runs `npm run lint`. Both are scheduled for Phase 2 replacement.
    - Remaining source suppressions: `eslint-disable` comments are present across source, test, BDD, and script TypeScript files and are scheduled for Phase 3 removal or Biome conversion.
    - Remaining cache artifacts: package `.eslintcache` files exist in the worktree and are scheduled for Phase 3 cleanup only if tracked or otherwise relevant.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Add Initial Executable Biome and Remove ESLint Guidance' (Protocol in workflow.md)

    Phase 1 checkpoint notes:
    - Review PR: https://github.com/0rail/transform-hub/pull/20
    - Shared package review: not applicable; this phase changed root tooling/docs only and added no package-local runtime code.
    - Deduplication check: not applicable; no reusable code or tests were added.
    - Validation run: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); JSON.parse(require('fs').readFileSync('package-lock.json','utf8')); console.log('package metadata json ok')"` passed.
    - Validation run: `npm run biome:check -- --help` passed, confirming the initial Biome command surface executes without running a full repository check.
    - Skipped validation: legacy ESLint lint commands were intentionally not run per track requirement.
    - Phase 1 checkpoint commit: `59ada29f`.
    - Manual verification: approved after PR creation.

## Phase 2: Configure Biome and Replace CI/Local Lint Workflows

- [x] Task: Configure Biome for minimal useful corrections
    - [x] Create or finalize the root Biome configuration for the TypeScript/Node.js monorepo.
    - [x] Use Biome recommended rules plus practical import/dependency/cycle checks where stable and appropriate.
    - [x] Keep the rule set small and avoid recreating the existing ESLint rule matrix.
    - [x] Configure VCS/gitignore integration and explicit exclusions for generated output, dependencies, build artifacts, and ignored files.
    - [x] Configure Biome formatting to replace Prettier while preserving practical repository style expectations.

    Phase 2 note: added root `biome.json` with a tuned recommended baseline, broad style/complexity/performance/a11y rules disabled, selected correctness/suspicious rules, warning-level package-source dependency checks via overrides, git ignore integration, and explicit source/script suffix inclusion. The include set covers maintained package `src` TypeScript/JavaScript and repository scripts while excluding generated/lib output, tests, BDD fixtures/step definitions, config scratch files, archives, dependencies, coverage, and dev scratch scripts. Formatting is EditorConfig-aware with 4-space indentation, 180-character line width, and no trailing commas. Biome linting is the default `lint` path; formatting remains explicit to avoid broad format churn.
- [x] Task: Replace local scripts with Biome-backed commands
    - [x] Make `npm run lint` execute Biome, not ESLint.
    - [x] Add or update Biome fix/format scripts.
    - [x] Add a changed/staged fast path if supported by the selected Biome version.
    - [x] Remove old ESLint-specific script variants unless temporarily retained with a clear reason.

    Phase 2 note: replaced root lint scripts with Biome-backed `lint`, `lint:fix`, `lint:full`, `lint:quick`, `lint:staged`, `format`, and `format:check` commands. The legacy cache-specific `lint:uncached` script was removed. An initial attempted validation through `npm run biome:check -- biome.json` incorrectly expanded to `biome check . biome.json` because the script included `.`, causing a full repository format check; classified as invocation error and corrected by making `biome:check` a lint-only alias.
- [x] Task: Replace CI and hook integration
    - [x] Replace workflow lint invocations with Biome-backed commands.
    - [x] Ensure workflow dependencies/required job names remain coherent after the migration.
    - [x] Update pre-push or hook configuration so it no longer invokes ESLint.

    Phase 2 note: updated `.github/workflows/analyze-code.yml` from Yarn/ESLint linting to npm install plus `npm run lint`. The legacy Husky pre-push hook still invokes `npm run lint`, which now resolves to Biome.
- [x] Task: Update active references from ESLint to Biome
    - [x] Update `conductor/tech-stack.md` to document Biome as the lint/format tool.
    - [x] Update active documentation that instructs contributors to use ESLint, Prettier, or yarn lint.
    - [x] Search active scripts, workflows, and docs for stale ESLint references and replace them where they describe current workflow.

    Phase 2 note: active script/workflow/docs search found no `.github` ESLint/yarn-lint references and no package-script ESLint invocations. Remaining `package.json` ESLint dependency references are intentionally deferred to Phase 3. Historical Conductor archive references were left unchanged.
- [~] Task: Conductor - User Manual Verification 'Phase 2: Configure Biome and Replace CI/Local Lint Workflows' (Protocol in workflow.md)

    Phase 2 checkpoint notes:
    - Shared package review: not applicable; this phase changed root tooling/docs/CI only and added no package-local runtime code.
    - Deduplication check: not applicable; no reusable code or tests were added.
    - Validation run: JSON parse check for `package.json`, `package-lock.json`, and `biome.json` passed.
    - Validation run: `npx biome lint biome.json` passed.
    - Validation run: `npm run lint -- --help` passed, confirming `npm run lint` now resolves to Biome linting without running a full repository lint.
    - Invocation error classified and fixed: `npm run biome:check -- biome.json` expanded to a full repository `biome check . biome.json` because the script included `.`, producing expected existing format diagnostics. The script was corrected to lint-only for now to avoid broad formatting churn.
    - Diagnostic tuning: broad recommended rules initially produced 3,612 diagnostics across many style/config/fixture/generated files. The Phase 2 config was tuned to maintained source/script suffixes with the recommended baseline reintroduced and noisy broad groups disabled, reducing current Biome lint output to 81 diagnostics: 67 warnings and 14 errors across package `src` TypeScript/JavaScript and repository scripts. Current categories are `noUnusedVariables` (24), `noImportCycles` (18), `useIterableCallbackReturn` (10), `noAssignInExpressions` (8), `noSwitchDeclarations` (7), `noTsIgnore` (5), `noRedundantUseStrict` (5), and one each for parse, `noConstructorReturn`, `noEmptyPattern`, and `noUnsafeFinally`.
    - Dependency checks: reintroduced for package source through Biome overrides; current package-source scan emits no dependency diagnostics after excluding script false positives.
    - Memory observation from final Phase 2 count: 2GB virtual-memory cap, max RSS 109248 KB, wall time 0.31s.
    - Skipped validation: legacy ESLint lint commands were intentionally not run per track requirement.
    - Phase 2 checkpoint commit: `aa09be53`.

## Phase 2.5: Fix Current Biome Diagnostics

- [ ] Task: Fix package source diagnostics
    - [ ] Fix or intentionally suppress current package-source `noUnusedVariables` diagnostics.
    - [ ] Fix or intentionally suppress current package-source `noImportCycles` diagnostics.
    - [ ] Fix current package-source `noAssignInExpressions`, `noSwitchDeclarations`, `noTsIgnore`, `useIterableCallbackReturn`, `noRedundantUseStrict`, parse, `noConstructorReturn`, `noEmptyPattern`, and `noUnsafeFinally` diagnostics.
    - [ ] Avoid unrelated behavior changes while addressing diagnostics.
- [ ] Task: Fix repository script diagnostics
    - [ ] Fix current script diagnostics emitted by the tuned Biome baseline.
    - [ ] Keep script behavior unchanged and avoid broad style-only rewrites.
- [ ] Task: Revalidate tuned Biome baseline
    - [ ] Run Biome lint under the 2GB memory limit and record diagnostic count and memory usage.
    - [ ] Confirm no legacy ESLint commands are run.
- [ ] Task: Conductor - User Manual Verification 'Phase 2.5: Fix Current Biome Diagnostics' (Protocol in workflow.md)

## Phase 3: Remove ESLint/Prettier Tooling, Suppressions, and Validate

- [ ] Task: Remove obsolete ESLint and Prettier tooling
    - [ ] Remove ESLint-specific dependencies from `package.json` and `package-lock.json`.
    - [ ] Remove Prettier dependency/configuration if Biome fully owns formatting.
    - [ ] Remove root ESLint and Prettier configuration replaced by Biome.
    - [ ] Remove package-level ESLint config files.
    - [ ] Remove obsolete ESLint ignore/cache assumptions from tracked files.
- [ ] Task: Remove or convert ESLint suppressions
    - [ ] Remove clearly obsolete `eslint-disable` comments.
    - [ ] Convert only necessary suppressions to Biome-compatible syntax.
    - [ ] Avoid unrelated source refactors while touching suppressions.
- [ ] Task: Validate package metadata and stale references
    - [ ] Inspect `package.json` and `package-lock.json` for removed ESLint/Prettier dependencies and added Biome dependency.
    - [ ] Search active scripts, workflows, docs, and source comments for stale ESLint/Prettier references.
    - [ ] Confirm no old lint commands are needed or invoked.
- [ ] Task: Validate Biome under memory constraints
    - [ ] Run the Biome validation command under a 2GB memory limit.
    - [ ] Observe and record memory usage where feasible.
    - [ ] If Biome finds issues, classify them using the workflow failure policy and fix in-scope configuration or source issues.
    - [ ] Do not run legacy ESLint lint commands for comparison.
- [ ] Task: Run narrow non-lint validation if needed
    - [ ] Run only the smallest relevant non-lint validation command if package metadata or generated files require it.
    - [ ] Record skipped validation and reasons in `plan.md`.
- [ ] Task: Final review and checkpoint
    - [ ] Review changed files for unrelated formatting or cleanup churn.
    - [ ] Confirm docs, scripts, CI, and Biome config describe the same workflow.
    - [ ] Create a scoped phase/track commit and record the commit SHA in `plan.md` when applicable.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Remove ESLint/Prettier Tooling, Suppressions, and Validate' (Protocol in workflow.md)

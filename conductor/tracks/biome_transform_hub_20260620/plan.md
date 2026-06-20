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
- [~] Task: Conductor - User Manual Verification 'Phase 1: Add Initial Executable Biome and Remove ESLint Guidance' (Protocol in workflow.md)

    Phase 1 checkpoint notes:
    - Shared package review: not applicable; this phase changed root tooling/docs only and added no package-local runtime code.
    - Deduplication check: not applicable; no reusable code or tests were added.
    - Validation run: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); JSON.parse(require('fs').readFileSync('package-lock.json','utf8')); console.log('package metadata json ok')"` passed.
    - Validation run: `npm run biome:check -- --help` passed, confirming the initial Biome command surface executes without running a full repository check.
    - Skipped validation: legacy ESLint lint commands were intentionally not run per track requirement.
    - Phase 1 checkpoint commit: pending.

## Phase 2: Configure Biome and Replace CI/Local Lint Workflows

- [ ] Task: Configure Biome for minimal useful corrections
    - [ ] Create or finalize the root Biome configuration for the TypeScript/Node.js monorepo.
    - [ ] Use Biome recommended rules plus practical import/dependency/cycle checks where stable and appropriate.
    - [ ] Keep the rule set small and avoid recreating the existing ESLint rule matrix.
    - [ ] Configure VCS/gitignore integration and explicit exclusions for generated output, dependencies, build artifacts, and ignored files.
    - [ ] Configure Biome formatting to replace Prettier while preserving practical repository style expectations.
- [ ] Task: Replace local scripts with Biome-backed commands
    - [ ] Make `npm run lint` execute Biome, not ESLint.
    - [ ] Add or update Biome fix/format scripts.
    - [ ] Add a changed/staged fast path if supported by the selected Biome version.
    - [ ] Remove old ESLint-specific script variants unless temporarily retained with a clear reason.
- [ ] Task: Replace CI and hook integration
    - [ ] Replace workflow lint invocations with Biome-backed commands.
    - [ ] Ensure workflow dependencies/required job names remain coherent after the migration.
    - [ ] Update pre-push or hook configuration so it no longer invokes ESLint.
- [ ] Task: Update active references from ESLint to Biome
    - [ ] Update `conductor/tech-stack.md` to document Biome as the lint/format tool.
    - [ ] Update active documentation that instructs contributors to use ESLint, Prettier, or yarn lint.
    - [ ] Search active scripts, workflows, and docs for stale ESLint references and replace them where they describe current workflow.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Configure Biome and Replace CI/Local Lint Workflows' (Protocol in workflow.md)

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

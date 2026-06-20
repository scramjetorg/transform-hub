# Implementation Plan: Biome for Transform Hub

## Phase 1: Add Initial Executable Biome and Remove ESLint Guidance

- [ ] Task: Create review surface for the track
    - [ ] Create a dedicated branch from the current branch `feat/manager-oss` unless directed otherwise.
    - [ ] Prepare the eventual PR title/description around the completed Biome migration state.
- [ ] Task: Add initial executable Biome entrypoint
    - [ ] Add Biome as a dev dependency using npm.
    - [ ] Add a minimal initial Biome command surface that can execute without becoming the final enforced configuration yet.
    - [ ] Keep the initial setup intentionally small so follow-up configuration can be reviewed separately.
- [ ] Task: Remove ESLint guidance from scripts and docs where safe in Phase 1
    - [ ] Remove or replace obvious developer-facing ESLint guidance in root scripts and active docs.
    - [ ] Update `AGENTS.md` and active Conductor/project docs to stop recommending legacy ESLint commands.
    - [ ] Preserve explicit warnings not to run old lint commands during this migration.
- [ ] Task: Inventory remaining ESLint and formatting surfaces for later phases
    - [ ] Confirm remaining ESLint dependencies, config files, CI references, hooks, and source suppressions.
    - [ ] Record what will be replaced in Phase 2 and removed in Phase 3.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Add Initial Executable Biome and Remove ESLint Guidance' (Protocol in workflow.md)

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

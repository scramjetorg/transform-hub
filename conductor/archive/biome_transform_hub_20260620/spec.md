# Specification: Biome for Transform Hub

## Overview

Replace the existing ESLint/Prettier-based lint and formatting setup in Scramjet Transform Hub with Biome as the default code quality and formatting tool. The migration should simplify the tooling model, improve lint/check speed, reduce memory pressure, and avoid preserving the current complex ESLint rule structure. Biome should become the standard developer and CI-facing lint/format command surface.

## Track Type

Chore / Tooling Migration

## Goals

- Replace ESLint as the default linting tool with Biome.
- Replace Prettier formatting with Biome formatting for supported files.
- Keep the Biome rule posture pragmatic: recommended rules plus useful import/dependency/cycle checks where stable and appropriate.
- Remove obsolete ESLint configuration, dependencies, scripts, CI usage, and active documentation references.
- Update source suppressions by removing obsolete `eslint-disable` comments or converting them to Biome suppressions only when still necessary.
- Validate the new Biome workflow without running the old lint commands.
- Measure or observe Biome memory usage under a 2GB memory limit during validation.

## Functional Requirements

1. Add Biome as the repository's default lint/check/format tool.
2. Add a root Biome configuration suitable for the TypeScript/Node.js monorepo.
3. Configure Biome formatting to replace the current Prettier setup while preserving the repository's practical style expectations where possible:
   - space indentation,
   - existing broad line-width preference,
   - no unnecessary formatting churn beyond Biome's standard behavior.
4. Configure Biome linting with:
   - recommended rules,
   - practical import/dependency/cycle checks where available and stable,
   - repository-specific file inclusion/exclusion for generated output, dependencies, build artifacts, and ignored files.
5. Replace root lint/format package scripts with Biome-backed scripts.
6. Remove ESLint-specific dependencies and configuration files.
7. Remove or replace Prettier configuration if Biome fully owns formatting.
8. Update CI workflows so required lint/check jobs use Biome instead of ESLint/yarn lint.
9. Update active project documentation and Conductor context that describe linting/tooling behavior.
10. Remove obsolete ESLint suppression comments and convert only the suppressions still needed for Biome.
11. Do not run the old ESLint lint commands during implementation or validation.

## Non-Functional Requirements

- The final lint/check workflow should be significantly faster and less memory-intensive than the current ESLint setup.
- The configuration should be intentionally small and maintainable.
- The migration should avoid introducing extra lint companion tools unless explicitly approved later.
- Validation should use the narrowest commands needed and respect the repository's memory constraints.
- Build/test behavior unrelated to linting should remain unchanged.

## Acceptance Criteria

- `npm run lint` uses Biome, not ESLint.
- A Biome fix/format script exists for maintainers to apply safe automated fixes.
- Old ESLint config files and ESLint dependencies are removed.
- Prettier is no longer the active formatter if Biome formatting fully replaces it.
- CI lint/check workflow no longer invokes ESLint or yarn lint.
- Active docs reflect Biome as the lint/format tool.
- No active script, workflow, or documentation path relies on the removed ESLint setup.
- Obsolete `eslint-disable` comments are removed, and any necessary suppressions are expressed in Biome-compatible form.
- Validation records Biome behavior under a 2GB memory cap and includes an observation of memory usage where feasible.
- No old lint commands are run.

## Out of Scope

- Adding Knip, dependency-cruiser, Madge, or other companion tools.
- Recreating the full existing ESLint rule matrix in Biome.
- Introducing custom Biome/GritQL plugins.
- Changing package build behavior, runtime protocols, API contracts, or adapter behavior.
- Running full legacy ESLint lint commands for comparison.
- Large unrelated formatting or cleanup beyond what is necessary for the Biome migration.

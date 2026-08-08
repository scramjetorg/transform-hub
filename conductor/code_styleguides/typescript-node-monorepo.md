# TypeScript Node Monorepo Code Style Guide

## Scope

Use this guide for TypeScript and JavaScript code in Scramjet Transform Hub packages, especially hub, API server, adapters, runners, runtime wrappers, shared types, and tests.

## Language and TypeScript Rules

- Write TypeScript as the default implementation language.
- Preserve strict TypeScript settings from `tsconfig.base.json`.
- Avoid implicit `any`; use explicit domain types from `@scramjet/types` where available.
- Keep declarations compatible with package exports.
- Do not leave unused locals; remove dead imports and variables.
- Prefer type-only imports for types when it improves clarity and avoids runtime dependencies.

## Formatting

- Use 4-space indentation.
- Use double quotes for strings.
- End statements with semicolons.
- Use Unix line endings.
- Keep object curly spacing: `{ value }`.
- Keep one blank line between logical blocks; avoid multiple consecutive empty lines.
- Keep lines under 180 characters when practical.

## Imports and Package Boundaries

- Prefer package imports such as `@scramjet/types` over relative cross-package imports.
- Avoid absolute path imports.
- Avoid unnecessary path segments.
- Avoid circular imports; refactor shared contracts or utilities when cycles appear.
- Keep package public exports intentional and aligned with package responsibility.

## Functions and Async Behavior

- Handle async failures explicitly; do not leave floating promises.
- Prefer `async`/`await` for asynchronous control flow.
- Prefer stream iteration for processing, avoid `on("data")` when possible.
- Keep functions focused and named around domain behavior.
- Use early validation for invalid config, unsupported engines, or wrong adapter type.
- Preserve lifecycle ordering in runner and adapter code.

## Error Handling and Logging

- Surface actionable errors with context.
- Use package logging utilities such as `ObjLogger` instead of direct console output.
- In runner code, `console.warn` and `console.error` are allowed where explicitly configured.
- Avoid swallowing errors unless the fallback behavior is intentional and documented.
- Include enough context for adapter/runtime failures without leaking secrets.

## Runtime and Adapter Code

- Keep process, Docker, and Kubernetes differences explicit.
- Preserve shared runner protocol semantics across Node, Python, Bun, and future runtimes.
- Do not add runtime-specific shortcuts that bypass shared contracts without documentation and tests.
- Keep environment assembly centralized through existing adapter utilities where possible.
- Treat sequence `engines` handling as a protocol boundary.

## Tests

- Add or update tests near the affected package.
- Use package test conventions and `*.spec.ts` naming.
- For runtime wrapper changes, include parity-oriented tests where behavior should match existing runtimes.
- Prefer focused unit tests before broad BDD tests unless the behavior crosses package/runtime boundaries.

## Documentation Alignment

- Update docs, README snippets, or CLI help when behavior changes.
- Keep docs aligned with actual defaults, adapter behavior, and runtime selection.
- Do not document unsupported runtime behavior as available.

## Repository Command Guidance

- Use `npm` for agent-run commands in this repository.
- Prefer package-level or changed-area checks over full Docker/BDD workflows unless required.
- Use `npm run build:packages` for package build validation when needed.
- Use `npm run test:packages:ci` for GitHub package-test validation and `npm run test:packages` for the local j4 default; phase-final remains the serial proof path.

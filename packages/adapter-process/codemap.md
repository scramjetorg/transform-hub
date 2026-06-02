# Package Atlas: adapter-process

## Responsibility

Process adapter runtime package for Scramjet Transform Hub. It bridges host-side adapter contracts to process-based execution and packaging, with runtime helpers exposed from `src/`.

## Design/Patterns

- Thin package shell over TypeScript sources in `src/`.
- Uses the shared workspace dependency graph from `@scramjet/*` packages.
- Publishes source entrypoints directly from package `main` and package scripts.

## Data & Control Flow

- Package scripts drive local start, test, build, docs, and publish flows.
- Runtime code is loaded from `src/index.ts` via the package entrypoint.
- Build/publish uses the monorepo build script and `prepack` hook.

## Integration Points

- Consumes `@scramjet/model`, `@scramjet/runner`, `@scramjet/utility`, `@scramjet/adapters-common`, and `@scramjet/sth-config`.
- Tests use AVA with `ts-node/register`.
- Documentation generation uses TypeDoc.

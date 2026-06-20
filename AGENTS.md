# Agent Notes

## First reads
- Read `codemap.md` before code changes; it lists the real entrypoints and package responsibilities.
- For deep work in a package, read that package's `codemap.md` when present.

## Package manager
- Use `npm`, not `yarn`, for agent-run commands in this repo.
- A root `package-lock.json` exists, but many historical scripts/CI snippets still mention `yarn`; do not copy those blindly. Prefer `npm ci`, `npm install`, `npm run <script>`, or the underlying `node scripts/...` command.

## High-value commands
- Install deps: `npm ci` for a clean install, `npm install` when updating the lockfile.
- Build packages only: `npm run build:packages` (`scripts/build-all.js -v -w modules --ts-config tsconfig.build.json`).
- Full build is expensive: `npm run build` includes packages, downloaded refapps, and Docker builds.
- Unit/package tests: `npm run test:packages-no-concurrent` is the CI-safe serial variant; `npm run test:packages` runs package tests concurrently.
- BDD smoke paths: `npm run test:bdd-ci-api-node`, `npm run test:bdd-ci-node`, `npm run test:bdd-ci-python`, or `npm run test:bdd`.
- Biome lint/format: `npm run lint`, `npm run lint:quick`, `npm run lint:fix`, `npm run format`, or the lower-level `npm run biome:check`/`npm run biome:lint`/`npm run biome:format` scripts. `lint` runs Biome linting; formatting remains an explicit `format` operation to avoid broad format churn.
- Runtime invariant check: `npm run check:runtime-invariants`.
- Dev hub: `npm run start:dev`; built hub: `npm run start` after building `dist/`.

## Monorepo wiring
- Workspaces are `packages/*` plus `bdd/`; custom workspace groups in `package.json` include `modules`, `runners`, and `bdd`.
- `scripts/run-script.js` runs a package script across workspaces; useful flags: `-w <group>`, `-s <package path|name>`, `-j <jobs>`, `-d <package>`, `-e <command>`.
- `scripts/build-all.js` builds TypeScript solution configs and pre-packs packages into `dist/`; useful flags: `-w <group>`, `-d <package>`, `--ts-config <file>`, `--no-install`, `--no-distws`.
- Main STH CLI source is `packages/sth/src/bin/hub.ts`; published/root bin points to `dist/sth/bin/hub.js`.
- Adapter-launched runner entrypoint is `packages/runner/src/bin/start-runner.ts`; executor selection is in `packages/runner/src/executor/select.ts`.
- Runtime wrapper packages (`runner-node`, `runner-python`) are protocol references for child process execution.

## Testing and generated files
- Most package tests use AVA with `ts-node/register` and match `**/*.spec.ts`.
- Agent-run tests and Node validation commands must start under `ulimit -v 1835008` and `NODE_OPTIONS="--max-old-space-size=1024"` unless run through a repo/package test runner that already controls the test process and memory behavior. Do not wait for OOM before applying this guard; use it by default when invoking tests directly or through npm scripts without runner-level memory handling.
- `packages/types` generates exposed type files via `packages/types/scripts/generate.js`; its `build:only` runs that generator.
- BDD tests use `bdd/` (`cucumber-js`) and often require built `dist/`, Docker images, and env like `RUNTIME_ADAPTER=process|docker`, `SCRAMJET_SPAWN_JS=1`, `SCRAMJET_TEST_LOG=1`, `SCP_ENV_VALUE=GH_CI`.
- Docker-adapter BDD also needs runner image artifacts/tags; avoid running full Docker BDD unless the task requires it.

## Sequence-test package status
- `@scramjet/sequence-test` is experimental/in-progress and must not be treated as the default valid testing solution for other packages.
- Keep using each package's existing AVA tests plus package build/lint validation unless the task explicitly asks for `@scramjet/sequence-test`.
- Do not replace package tests, BDD tests, adapter tests, or runtime invariant checks with `@scramjet/sequence-test` unless explicitly directed.

## Toolchain constraints
- TypeScript base is strict CommonJS targeting ES2019, with `allowJs`, decorators, declarations, and `noUnusedLocals` enabled.
- Lint/format tooling uses Biome during the migration track. Do not run legacy ESLint commands unless the active track explicitly re-enables them.

## Repository Map

A full codemap is available at `codemap.md` in the project root.

Before working on any task, read `codemap.md` to understand:
- Project architecture and entry points
- Directory responsibilities and design patterns
- Data flow and integration points between modules

For deep work on a specific folder, also read that folder's `codemap.md`.

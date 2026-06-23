# bdd/

## Responsibility

BDD smoke and end-to-end validation workspace for Scramjet Transform Hub. It defines Cucumber feature coverage, step definitions, fixtures, packaged sequence samples, and helper utilities used by the root BDD scripts to exercise CLI, hub, Manager/MultiManager, instance API, streaming, topics, and runtime behavior.

## Design/Patterns

- Cucumber test harness: `cucumber.js` loads TypeScript step definitions through `ts-node/register`, excludes `@ignore` and harness self-tests by default, and can emit HTML reports under `reports/`.
- Shared World object: `step-definitions/world.ts` (`CustomWorld`) centralizes mutable test resources, API clients, spawned processes, selected sequence/instance IDs, and CLI command state.
- Process fixture pattern: `lib/host-utils.ts` starts either the built hub (`../dist/sth/bin/hub.js`) or source hub (`packages/sth/src/bin/hub.ts`) based on environment flags, tracks child process groups, and installs cleanup handlers.
- Utility polling and stream helpers: `lib/utils.ts` provides CLI command selection, spawn output collection, retry loops, file/log assertions, stream-to-string conversion, and profile helpers.

## Data & Control Flow

1. Root npm BDD scripts enter this workspace and run `cucumber-js` using `bdd/cucumber.js`.
2. Cucumber loads `step-definitions/**/*.ts`, constructs `CustomWorld`, and stores clients/processes in `world.resources` and `world.cliResources`.
3. Feature steps spawn or attach to STH/Manager/MultiManager processes, deploy sequence tarballs from `data/` or `fixtures/`, and interact through Scramjet API clients or the CLI.
4. Step utilities poll API status, collect stdout/stderr and stream payloads, assert expected lifecycle/API behavior, and clean up spawned processes at process exit or test teardown.

## Integration Points

- Consumed by root scripts: `npm run test:bdd`, `npm run test:bdd-ci-node`, `npm run test:bdd-ci-python`, and `npm run test:bdd-ci-api-node`.
- Depends on workspace clients: `@scramjet/api-client`, `@scramjet/multi-manager-api-client`, `@scramjet/sth-config`, and shared `@scramjet/types`.
- Uses generated/built entrypoints from `dist/` by default, with source execution toggles via `SCRAMJET_SPAWN_JS`, `SCRAMJET_SPAWN_TS`, and runtime adapter flags.
- Feature domains live under `features/hub/`, `features/e2e/`, `features/manager/`, `features/reference-apps/`, and harness-specific feature folders.

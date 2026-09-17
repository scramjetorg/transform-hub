# Phase 5: Compiled BDD Mode and ts-node Inventory

## Phase Acceptance Criteria

- [ ] Compiled BDD mode loads generated `bdd/dist` JavaScript without `ts-node/register`.
- [ ] `build:bdd` is an intentional cacheable prerequisite in every compiled CI lane; clean-workspace, missing-output, and stale-output proofs pass or fail as intended.
- [ ] Source BDD mode remains explicit for development and source-launch requirements.
- [ ] Unit and BDD `ts-node` uses are inventoried with purpose and scope status.

## Owned Paths

- `bdd/cucumber.js`
- `bdd/package.json`
- `bdd/tsconfig.json`
- `scripts/run-bdd-docker.js`
- Root BDD scripts and affected CI workflow wiring
- `bdd/step-definitions/manager/common.ts`
- `bdd/step-definitions/manager/aggregation-repro.ts`

## Tasks

- [ ] Define compiled and explicit source BDD runner configuration.
- [ ] Place the BDD build gate at a cacheable CI/container boundary and wire it into every compiled CI lane.
- [ ] Add focused runner regression coverage proving compiled mode succeeds from freshly built output and rejects missing or source-stale output.
- [ ] Assess source-mode Manager/MultiManager `npx ts-node` launchers for compatible `tsx` migration or performance-lane exclusion.
- [ ] Publish the `ts-node` inventory without changing unrelated AVA staging.

## Verification Commands

- `npm --prefix bdd run build:bdd`
- Relevant supported `npm run test:bdd-ci-*` commands in compiled mode.
- Focused source-mode BDD command where source-launch support remains.
- Supported focused runner regression command for compiled-mode clean, missing-output, and stale-output cases.

## Non-goals

- No blanket replacement of package-level `ts-node` hooks.
- No CI lane expansion without preserving current supported lanes.

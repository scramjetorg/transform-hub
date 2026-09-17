# Phase 2: Safe Unit Rationalization

## Phase Acceptance Criteria

- [ ] Only approved safe candidates and safe-ish candidates with confirmed preconditions are removed.
- [ ] Package test commands remain intentional and valid after every removal.
- [ ] Distinct runtime, adapter, protocol, API, CLI, lifecycle, type-contract, and error/value coverage remains.

## Owned Paths

- Confirmed files under `packages/**/test/`
- Affected `packages/*/package.json` only when a confirmed zero-spec command decision requires it

## Tasks

- [ ] Remove confirmed `t.pass()` placeholders that coexist with substantive coverage.
- [ ] Remove the confirmed contained runner executor assertion only if its counterpart remains.
- [ ] Gate sole-test placeholders, export-smoke, scaffold, and no-assertion candidates on approved IDs and preconditions in Phase 1's Test Audit Register.

## Verification Commands

- `npm run test:packages:phase-final`
- Targeted supported package `npm test` commands for every affected workspace.
- `npm run build:packages`

## Non-goals

- No removal of overlap or overcautious findings without separate user approval.
- No test-runner redesign.

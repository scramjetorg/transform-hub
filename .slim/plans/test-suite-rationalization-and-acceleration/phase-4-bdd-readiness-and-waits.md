# Phase 4: BDD Readiness and Waits

## Phase Acceptance Criteria

- [ ] Every removed delay has a state/event predicate, deadline, retry policy, and timeout diagnostics.
- [ ] Service health, instance lifecycle, protocol stream ordering, and semantic fixture delays remain covered.
- [ ] Replacements do not poll cross-scenario resources.

## Owned Paths

- `bdd/lib/utils.ts`
- `bdd/lib/readiness.js`
- Relevant BDD step definitions and features containing confirmed non-semantic waits

## Tasks

- [ ] Classify waits as semantic, readiness, or replaceable fixed delay.
- [ ] Replace approved delays with contract-level predicates.
- [ ] Preserve diagnostic context and verify no race is masked.

## Verification Commands

- Relevant supported `npm run test:bdd-ci-*` command for every changed feature family.
- `npm run test:memory-guard-bdd-focused` when hooks, runner options, or BDD memory support changes.

## Non-goals

- Do not remove fixture-defined timing under test.
- Do not shorten timeouts without evidence.

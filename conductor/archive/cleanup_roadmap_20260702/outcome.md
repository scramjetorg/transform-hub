# Outcome: Cleanup Roadmap Phases for Archival Cleanup Tasks

## Summary

Completed the archival cleanup roadmap across Phases 1-9 in PR #53. The track removed proven-dead cleanup targets, hardened BDD teardown behavior, proved retained legacy package health, and recorded compatibility surfaces that remain intentionally retained for later breaking-change or extraction plans.

## Key Changes

- **Docs/tooling cleanup**: retired stale documentation-generation surfaces and refreshed generated documentation outputs/codemaps where required.
- **Config cleanup**: proved config parity, made `@scramjet/config` the canonical config package, migrated active consumers, and removed legacy config packages.
- **API/client compatibility**: retained public v1 and compatibility client surfaces while documenting boundaries for later decisions.
- **BDD/refapp cleanup**: removed dead BDD/refapp placeholders, replaced old downloaded Python refapps with local fixtures, and validated current Python sequence fixture behavior.
- **BDD infrastructure hardening**: made Host/Manager teardown current-run scoped, awaited process exits with TERM-to-KILL escalation, removed broad process-name killing, and added opt-in leak failure via `SCRAMJET_BDD_FAIL_ON_LEAK=1`.
- **Retained legacy package proof**: retained `packages/verser`, `packages/bpmux`, and deprecated `@scramjet/types`; proved `verser`/`bpmux` monorepo and standalone import/typecheck behavior; added a `bpmux` codemap and smoke test.
- **Transport cleanup**: removed only the proven-dead type-only `ResolverTarget.localForwardPath` field; retained active v1 RPC fallback and unsupported/intentional verser2 edge cases.
- **Deferred removal record**: added `deferred-removals.md` documenting retained surfaces and future proof requirements.

## Validation Summary

| Validation | Result |
|---|---|
| `git diff --check` | Passed |
| `npm run lint:quick` | Passed with pre-existing `scripts/docs.js` warnings only |
| `npm run build:packages` | Passed |
| `npm run check:runtime-invariants` | Passed (8/8 guards) |
| `npm run check:typings-split` | Passed during Phase 7 |
| Phase 7 retained package proof | `bpmux` smoke, `verser` build/test, manager tests, and standalone tarball type/import proof passed |
| Phase 8 transport package tests | `api-router`, `api-server`, `host`, and `manager` package tests passed |
| Phase 6 BDD checks | AppContext, API topic, Node, and Python BDD paths passed with leak-focused validation |
| Final Oracle review | Approved with no code blockers |

## Retained / Deferred

- Public v1 APIs remain retained.
- Legacy sequence APIs such as `this.hub` and `this.space` remain retained.
- Deprecated `@scramjet/types` remains retained.
- `packages/verser` and `packages/bpmux` remain retained as standalone legacy packages.
- v1 RPC fallback / `createForwardController`, explicit legacy broker hard-fail policy, and unsupported verser2 edge cases are deferred and documented in `deferred-removals.md`.
- Broader BDD identity-assertion hardening remains a future follow-up where scenario-specific IDs are available.

## Final State

All 9 phases completed, reviewed, pushed, and PR-commented. PR #53 was marked ready for review after finalization and is being merged into `feat/manager-oss`.

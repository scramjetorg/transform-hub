# Outcome: Implement Manager Aggregation Fix

## Summary

Completed the `0rail/transform-hub#15` Manager aggregation fix for MultiManager-proxied Manager endpoints:

- `/api/v1/cpm/<manager-id>/api/v1/list`
- `/api/v1/cpm/<manager-id>/api/v1/all_sequences`
- `/api/v1/cpm/<manager-id>/api/v1/instances`

The final branch is `conductor/implement-manager-fix`, based on `feat/manager-oss`, with local HEAD `152c7381 fix(adapter-kubernetes): align extract options with tar types`.

## What Was Done

- Added a minimal failing repro for missed Manager aggregation inventory.
- Fixed Manager registration ordering so hub state and event handlers are installed before `STHController.init()` can emit initial inventory.
- Added rollback cleanup for failed STH initialization using narrow internal helpers:
  - `ISTHConnectionStore.remove()` / `SthConnectionStore.remove()`
  - `ISTHInfoRegister.removeHub()` / `STHInfoRegister.removeHub()`
- Normalized Manager instance event payload handling to accept both wrapped `{ instance }` records and raw `Instance` objects.
- Added focused Manager tests for:
  - inventory emitted during registration init,
  - re-registration clearing stale inventory,
  - init rollback,
  - raw and wrapped instance events,
  - raw `GONE` instance deletion,
  - bulk raw instance inventory from `STHController.hostMessageHandler()`.
- Replaced brittle ad-hoc Docker repro assets with canonical BDD regression coverage under:
  - `bdd/features/manager/MANAGER-002-aggregation-repro.feature`
  - `bdd/step-definitions/manager/aggregation-repro.ts`
  - `bdd/fixtures/manager-aggregation/`
- Added Host-side `communicationReady` handling so inventory snapshots are sent only after the communication stream exists.
- Fixed MultiManager verser2 Host federation by setting a stable `hostId` from `localBroker.peerId`.
- Made Manager `/log` stream setup best-effort while preserving `/platform` as the critical registration stream.
- Hardened BDD cleanup by tracking spawned hub processes immediately after spawn.
- Fixed the Kubernetes adapter source-mode BDD blocker by aligning `tar.x()` extract options with the installed `@types/tar` contract.

## Validation

Passed validations recorded during the track:

- `npm --workspace @scramjet/manager run test:ava -- test/manager-registration.spec.ts`
- `npm --workspace @scramjet/multi-manager test -- test/lib/verser2-host-config.spec.ts`
- `BDD_INCLUDE_LONG_RUNNING=1 SCRAMJET_SPAWN_TS=1 npm --prefix bdd run test:bdd -- -t "@manager-aggregation-repro"`
- `npm run build:packages`
- `npx tsc -p packages/adapter-kubernetes/tsconfig.build.json --noEmit --pretty false`
- `npm --workspace @scramjet/adapter-kubernetes run build`

The final BDD result after the Kubernetes adapter correction was:

```text
1 scenario (1 passed)
16 steps (16 passed)
```

## Review Notes

- Oracle review found no blocking issues in the Manager fix.
- Non-blocking follow-ups noted during review:
  - BDD assertions are count-based and could be strengthened with identity checks for hub, sequence, and instance ids.
  - `communicationReady` behavior is covered by BDD but could use a focused package-level test.
  - Runtime instance payload types still understate raw `Instance` payloads accepted by Manager normalization.
  - BDD process cleanup could be made more robust with awaited exits and SIGKILL fallback.

## Important Commits

- `c53db3a0 test(manager): add aggregation repro`
- `8176812e test(manager): reproduce aggregation registration gaps`
- `9b0d49b9 fix(manager): preserve aggregation inventory during registration`
- `9b512443 test(manager): add clean aggregation BDD regression`
- `a809ce3b test(manager): harden aggregation BDD cleanup`
- `5021a2f1 fix(adapter-kubernetes): use tar api option names`
- `152c7381 fix(adapter-kubernetes): align extract options with tar types`

## Final State

The track is complete and archived. Parent `drumwave-integration` integration should deliberately bump the `sth` submodule to the final desired STH commit and then update/retire the parent known-red Manager aggregation evidence after parent-level validation passes.

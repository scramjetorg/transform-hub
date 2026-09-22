# Phase 4 — Cleanup/DX

## Goal

Remove confusion and drift after the recommended workflow is working, without removing compatibility behaviour.

## Owned paths

- `packages/cli/src/{bin/**,lib/commands/**}`, `packages/multi-manager/Dockerfile`, and focused tests for those changed paths

## Tasks

- [ ] Reconcile remaining CLI aliases/help and external `si init` assumptions after Phase 3 owns all documentation migration and generated-docs drift.
- [ ] Remove or correct stale `EXPOSE 11001` metadata after confirming no runtime listener/use case.
- [ ] Consolidate native/compatibility terminology and ensure aliases show migration guidance rather than being presented as default setup.

## Acceptance criteria

- No changed user-facing page or help surface presents legacy transport as the recommended fresh path.
- Cleanup preserves documented compatibility behavior and migration guidance.

## Verification

- Focused CLI help/config tests and diff-based confirmation of Docker/listener claims.

## Non-goals

- Removing supported legacy APIs or broad unrelated refactoring.

# Outcome: Fix Issue 26 — Auto-Derive Unique STH Runner Verser2 Host Identities

## Summary

Completed bug fix for GitHub issue #26. The static default STH-local runner Verser2 broker identity (`sth.default.runner.broker`) was replaced with automatic host-ID-derived resolution. This prevents runner Host ID collisions in multi-STH deployments sharing a Manager/MultiManager.

## Changes Made

| Package | Change |
|---|---|
| `packages/sth-config/src/default-config.ts` | Default `verser2.runnerHost.localBroker.peerId` changed to `"auto"` |
| `packages/host/src/lib/runner-verser2-host-config.ts` | `auto` resolves to `sth.<hostId>.runner.broker`; legacy `sth.default.runner.broker` emits warning |
| `packages/host/src/lib/host.ts` | Added `resolveStableHostId()` fallback so clean local startup generates/persists a Host ID before runner Host config resolution |

## Validation Results

| Test Suite | Result |
|---|---|
| `packages/host` — runner-verser2-host-config | 21 passed |
| `packages/host` — host-id | 2 passed |
| `packages/sth-config` — defaults | 8 passed |
| `packages/config` — schema/options | 15 passed |
| TypeScript compilation (host, sth-config, config) | Passed |
| `scripts/build-all.js -d packages/host` | Passed |

## Important Commits

- `f350ee9e` — `fix: derive runner host broker identity`

## PR

https://github.com/0rail/transform-hub/pull/31

## Deferred / Out of Scope

- Full downstream drumwave-integration E2E and BDD smoke tests (scoped to focused package tests)
- Hard-failing explicit legacy `sth.default.runner.broker` config (warning only in this track)
- Manager/MultiManager trust model or auto-trust changes
- Main STH Verser2 broker/guest identity semantics
- Broad duplicate federated Host ID error-message redesign

## Final State

All Phase 1–4 tasks complete. Track implementation merged and validated against acceptance criteria defined in `spec.md`.

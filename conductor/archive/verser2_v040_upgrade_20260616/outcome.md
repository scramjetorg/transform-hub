# Outcome: verser2 v0.4.0 Native Redirects and Upstream Tunnels

## Summary

Upgraded verser2 integration from v0.3.1 → v0.4.0 → v0.4.1 across all runtime wrappers and adopted native 308 redirects and upstream Host federation, replacing local-fallback forwarding. All 5 phases completed and approved. PR #12.

## Key Changes

- **Dependency upgrade**: `@signicode/verser2-*` packages updated to v0.4.1 across Node, Python, and Bun runtimes. `package-lock.json` and runner-python wheel updated.
- **Native 308 redirects**: Manager follow-forwarding replaced dummy/internal dispatch with native verser2 `308` redirect responses for follow-safe routes. Route classifier preserved Manager-owned, multiplex, and unsupported-bidirectional decisions. Existing direct route metadata retained for STH-originated payloads.
- **Upstream Host federation**: `Host.startRunnerVerser2Host()` now calls `connectUpstream()` to the Manager/MultiManager Host using existing `verser2.hostUrl` and `verser2.tls` config. Non-strict startup logs failures and retains fallback; strict platform mode rethrows.
- **Isolated verser2 BDD gate**: Added `bdd/features/verser2/VERSER2-001-isolated-routing.feature` with `@ci-verser2` tag and dedicated `npm run test:bdd-ci-verser2` gate. Proves native `308` redirect-following across upstream Host federation without Hub/Manager startup.
- **Startup-order documentation**: Sequences started before Hub connects to Manager are local-only for Space API access; documented limitation.

## Validation Summary

| Area | Result |
|---|---|
| `npm run build:packages` | Passed |
| `npm run test:packages-no-concurrent` | Passed |
| `npm run lint` | Passed (repository-wide style/promise issues fixed) |
| `npm run check:runtime-invariants` | Passed |
| `npm run check:verser2-packages` | Passed |
| `npm run test:bdd-ci-verser2` | Passed |
| `npm run test:bdd-ci-api-node` | Passed (transient retry) |
| `npm run test:bdd-ci-node` | Passed |
| Manager route-classifier/verser2-transport tests | Passed |
| Host upstream/config tests | Passed |
| Runner/runner-node/runner-python/runner-bun tests | Passed |
| MultiManager tests | Passed |
| `git diff --check` | Passed |

## Deferred Follow-ups

| Item | Reason |
|---|---|
| Generic CONNECT tunneling | Unsupported by public Host/Guest API |
| Runner RPC/control streams | Remain on local forwarding (not affected by v0.4.1 tunnel APIs) |
| Manager-owned/multiplexed routes | Remain Manager-local |
| `/platform`, `/inout`, trailers, informational responses | Intentionally unsupported |
| Public config for upstream federation | Deferred until multi-upstream, failover, or proxy credentials become concrete requirements |
| Storage proxy behavioral repair | Out of scope |

## Retained Local Forwarding

Code paths preserved because native verser2 behavior does not replace them:
- `packages/api-server/src/handlers/routed-forward.ts` — active runner RPC primary/fallback
- `packages/api-server/src/handlers/forward.ts` — generic URL forwarding
- Manager-owned/multiplexed route handling

## Final State

All 5 phases completed, each manually verified and approved by the user. Track merged via PR #12. Verser2 integration is at v0.4.1 with native 308 redirect adoption and upstream Host federation. Obsolete Manager dummy/internal follow dispatch was removed; no API-server forwarding code was removed because remaining paths serve active runner RPC and compatibility needs. Documentation artifacts (`phase1-api-discovery.md`, `native-redirect-contract.md`, `phase3-communication-paths.md`, `phase3-config-decision.md`, `phase3-upstream-federation-gap.md`, `phase5-cleanup-review.md`) retained for architecture context.

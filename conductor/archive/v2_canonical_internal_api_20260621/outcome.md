# Outcome: v2 Canonical Internal API

## Summary

Large-scale refactor making REST API v2 the canonical internal API surface for Scramjet Transform Hub while preserving full external v1 compatibility. Addressed open issues #23, #24, #26, #27, #28, and #29 across five phases, each validated and manually approved.

## Issues Addressed

| Issue | Area | Resolution |
|---|---|---|
| #28 | Host health/readiness | Added `/api/v1/health` to Host v1 compatibility router |
| #29 | Manager aggregation metadata | Preserved `instanceName`, sequence identity, hub/location metadata in aggregation |
| #26 | Runner Verser2 identity | Auto-derived unique runner broker peer ID from STH host identity |
| #27 | Manager aggregation readiness | Deterministic per-hub inventory-consumed state in Manager v2 health |
| #23, #24 | Stream compatibility | Revalidated `transfer-encoding` and `flushHeaders()` shim; upstream issue still open, shim deferred |

## Key Changes by Area

- **Host v1 compatibility**: Added `/api/v1/health` endpoint; preserved all existing v1 routes.
- **Manager aggregation**: `STHInfoRegister` stores hub-qualified keys; Manager v2 health includes unpaginated aggregation readiness summary (total/active hubs, sequence/instance counts, per-hub consumed status).
- **Runner Verser2 identity**: Default runner broker peer ID changed to `auto`, resolves to `sth.<hostId>.runner.broker`; explicit legacy `sth.default.runner.broker` emits warning.
- **Sequence v2 accessors**: `this.hubClient()` and `this.spaceClient()` added to `AppContext`, backed by `@scramjet/rest-api2` fluent clients over `/api/v2`; legacy `this.hub`/`this.space` preserved.
- **API client v2 facade**: HostClient and ManagerClient preserve legacy method names/response shapes while delegating via injectable v2-backed client utilities.
- **v1 boundary audit**: All remaining `/api/v1` literals classified as external compatibility, legacy tests, docs, or deliberate proxy paths.
- **Documentation**: Updated `writing-sequences.md`, `client-usage.md`, and `manager/overview.md`.

## Important Commits

| SHA | Message |
|---|---|
| `033fb819` | `feat(conductor): Complete v2 canonical API phase 1` |
| `3a50a0b3` | `feat(conductor): Complete v2 canonical API phase 2` |
| `3b535d92` | `feat(conductor): Complete v2 canonical API phase 3` |
| `25179523` | `feat(conductor): Complete v2 canonical API phase 4` |
| `b0a846eb` | `fix(conductor): Default app context clients to unknown` |
| `2d17588f` | `feat(conductor): Complete v2 canonical API phase 5` |

## Validation Summary

| Validation | Result |
|---|---|
| Host focused phase tests | 53 passed |
| Manager readiness/API tests | 49 passed |
| Runner-node context tests | 11 passed |
| Runner app-context test | 1 passed |
| Api-client facade tests | 4 passed |
| Rest-api2 tests | 17 passed |
| Sequence-test fixture suite | 10 passed |
| BDD `HUB-002 TC-006` | 1 scenario, 9 steps passed |
| `npm run build:packages` | Passed |
| Biome lint (changed files) | Passed |
| `git diff --check` | Passed |

Known preexisting issues (not introduced by this track): `WebAssembly is not defined` under AVA `--jitless` in host/runner tests, and Node MaxListenersExceeded warnings in high-fanout readiness tests.

## Deferred / Out of Scope

- Upstream `signicode/verser2#46` `flushHeaders()` fix (shim retained locally)
- Legacy `packages/runner` v1 client replacement (runner uses legacy `RunnerAppContext`; deferred until explicit migration)
- Full Docker/BDD validation (targeted BDD added per phase)
- Removing public v1 endpoints
- Breaking existing `this.hub`/`this.space` sequence code
- Manager/MultiManager topology redesign beyond aggregation/readiness and API migration

## Final State

All 5 phases completed, each manually verified and approved by the user. Track merged via PR #30 on branch `conductor/v2-canonical-internal-api-20260621` (forked from `feat/manager-oss`). All acceptance criteria from `spec.md` met.

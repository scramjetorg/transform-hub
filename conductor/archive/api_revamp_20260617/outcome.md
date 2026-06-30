# Outcome: API Revamp

## Summary

Large-scale feature track creating a schema-aware API routing layer (`@scramjet/api-router`) and v2 API contract/client package (`@scramjet/rest-api2`), migrating all v1 API surfaces to a v2-backed architecture while preserving exact v1 compatibility. All 10 phases completed and manually approved. PR #13.

## Packages Created

| Package | Purpose |
|---|---|
| `@scramjet/api-router` | Decorator/imperative route declaration, Zod-first validation, hook pipeline, OpenAPI 3.1 generation, HTTP/verser2 route adapters, static/dynamic router mount, generic client manifest |
| `@scramjet/rest-api2` | `RestAPI2.*` v2 public type contracts, shared handlerless route definitions/schemas (`RestAPI2Schemas`, `RestAPI2Routes`, `RestAPI2RouteSets`), common `Client`/`ClientTransport` with HTTP and verser2 transports |

## Key Deliverables

- **Router foundation**: decorator/imperative route declaration, Zod schema validation with inferred handler types, hook pipeline (CORS, headers, request logging, error handling), static `mount()` and dynamic `resolve()` primitives, OpenAPI 3.1 CLI generator with safe schema-mode module loading.
- **Adapters**: HTTP route registration into existing `APIRoute`/`APIExpose` surface; verser2 registration without binding to a concrete broker implementation.
- **Generic client**: `createApiClient()` from route/schema manifests with HTTP and verser2 transports; `createClientRequestProbe()` no-circumvention test fixtures.
- **v1 API extraction**: Host, Manager, and MultiManager API surfaces split into coordinator + `*-api-v1.ts` + `*-api-v2.ts`. V1 route registration and behavior remain unchanged.
- **Host v2 routes**: Hub (load/version/config/status/sequences/instances/entities/topics/logs/audit), Sequence (delete/start/read/list), Instance/CSI (info/delete/patch/health/output/input/logs/monitoring/stdio/events/RPC boundary).
- **Manager v2 routes**: version/config/trust/load/health/hubs/instances/sequences/entities/topics/logs/audit/disconnect; storage compatibility proxy for objects; inventory hub delete/disconnect.
- **MultiManager v2 routes**: version/info/load/list/health/trust/start/stop (with resolver + verser2 `308` redirect for cross-node routing).
- **Componentized health checks**: shared default components in `@scramjet/load-check`; Hub/Manager/MultiManager v2 health returns `HealthCheckInfo<T>` with typed component arrays.
- **Typed route binding**: `bindRoutes()` and `bindResolver()` compile-time helpers enforce handler/contract parity and reject missing or extra handler keys.
- **Schema precision correction**: replaced simplistic `z.unknown()` with precise DTO-focused Zod schemas per route family.
- **V1 compatibility adapters**: Host `/api/v1/version`, `/api/v1/config`, `/api/v1/status` backed by shared v2 read handlers with exact v1 response shape preservation.
- **BDD smoke**: `npm run test:bdd-ci-api-node` passes (20 scenarios, 101 steps).

## Validation Summary

| Area | Result |
|---|---|
| `@scramjet/api-router` tests | 45 passed |
| `@scramjet/rest-api2` tests | 17 passed |
| `@scramjet/api-server` tests | 48 passed |
| Focused Host API v1/v2 tests | 49 passed |
| Focused Manager API v1/v2 tests | 17 passed |
| Focused MultiManager API v1/v2 tests | 12 passed |
| `npm run build:packages` | Passed |
| `npm run test:bdd-ci-api-node` | 20 scenarios, 101 steps passed |
| Typechecks (api-router, rest-api2, host, manager, multi-manager, config, etc.) | Passed |
| ESLint narrowed source checks | Passed (preexisting warnings only) |
| `git diff --check` | Passed |

All v1 compatibility hotwire tests remain unchanged and passing.

## Deferred Follow-ups

| Item | Reason |
|---|---|
| Full v1 backing beyond Host version/config/status | Exact compatibility not yet proven for stream/operation/storage/forwarding payloads |
| Storage proxy (Disk/S3) behavioral repair | Explicitly out of scope by user direction; v2 storage remains documented compatibility proxy |
| Content-range semantics for v2 stream/list | Deliberate design not in this track's scope |
| BDD no-circumvention enforcement | No BDD tests migrated to v2 in this track; deferred until BDD steps use `@scramjet/rest-api2` client |
| MultiManager v2 logs runtime handler | Defined in contracts but runtime binding incomplete |
| Remote route mounting/resolution | Intentionally deferred; cross-node routing uses verser2 `308` redirects through `Router.resolve` |

## Important Commits

| SHA | Message |
|---|---|
| `de75c287`, `dc1cb951`, `7467786d` | Phase 1 foundational commits |
| `a48087f4`, `6077350c`, `2c8a4cc4`, `071d416d`, `d53c6d51` | Phase 7 checkpoint |
| `d37178b5`, `74bee3fc`, `ca173f4d`, `adbdf05a`, `cb389b36`, `6d2acb1c` | Phase 7.5 checkpoint |
| `1d0e736c` | Phase 8 checkpoint |
| `a7cf2da3` | Phase 8 correction (v1/v2 file split, Instance v2 ownership) |
| `cd41d5e7` | Phase 8.5 checkpoint (dynamic resolver mount) |
| `4e2672d6` | `feat(api): share v2 route contracts` |
| `b1d804b2` | Phase 10 checkpoint (final validation) |

## Final State

All 10 phases (plus Phase 7.5, 8.5, 9.5 sub-phases) completed, each manually verified and approved by the user. Track merged via PR #13 on branch `conductor/api-revamp-20260617` (forked from `feat/manager-oss`). V2 API surface is live over HTTP and verser2 routing; all v1 behavior remains unchanged and backed by dedicated compatibility tests.

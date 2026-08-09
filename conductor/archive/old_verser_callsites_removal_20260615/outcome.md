# Outcome: Remove Legacy Old-Verser Active Callsites

## Summary

Removed all active runtime callsites, configuration surfaces, tests, and package dependencies for the legacy `@scramjet/verser` transport, BPMux-backed usage, and legacy runner socket protocol paths. Verser2 is now the only supported Manager/STH connectivity implementation. PR #11 (merged into `feat/manager-oss`).

## Key Changes

- **Host/STH**: `CPMConnector` no longer constructs `VerserClient`/`VerserClientConnection`; verser2 is unconditional. Removed `SocketServer` and `LegacyRunnerTransport` leftovers.
- **Manager**: Removed `VerserConnection` from `STHController`, `handleHostConnection()`, forwarding, and connection store. STHController now requires verser2 broker/route metadata only.
- **MultiManager**: Removed `apiVerser`, `attachVerserListeners`, `attachHostAPI`, `attachMultiHostAPI`, `handleSTHRequest`, `/msth/:id` forwarding, `MultiHostController`/store active usage.
- **Config/types**: Removed `migrationMode`, `Verser2MigrationMode`, `legacy`, `dual` from all config schemas, defaults, CLI/env descriptors, and shared types.
- **Runner**: Removed legacy runner transport shape `{ kind: "legacy" }`, raw `HostClient` branch, legacy adapter fallback.
- **Dependencies**: Removed `@scramjet/verser` and `@scramjet/bpmux` from `packages/host`, `packages/manager`, `packages/multi-manager`, and `packages/types`. Only standalone `packages/verser` and `packages/bpmux` retain them.
- **Standalone packages preserved**: `packages/verser` and `packages/bpmux` remain buildable workspace packages with their own tests/dependencies.
- **Runtime invariant guards**: Durable Guard 7 prevents reintroduction of old-verser/BPMux imports, migration-mode selectors, legacy runner config, or `SocketServer` in active packages.

## Validation Summary

| Validation | Result |
|---|---|
| `npm run build:packages` | Passed |
| `npm run check:runtime-invariants` | Passed (8 durable guards) |
| `npm run test:packages-no-concurrent` | Passed |
| Focused package tests (config, host, manager, multi-manager, types, runner, etc.) | Passed |
| Standalone `@scramjet/verser` tests | Passed |
| `npm run test:bdd-ci-api-node` | 20 scenarios, 101 steps passed |
| `npm run test:bdd-ci-node` | 2 scenarios, 14 steps passed |
| Repository-wide static absence search | No active old-verser/BPMux/socket traces outside standalone packages and historical notes |
| Active package manifest dependency check | No active package outside `packages/verser`/`packages/bpmux` depends on `@scramjet/verser` or `@scramjet/bpmux` |

## Deferred / Out of Scope

- Publishing verser2 to npmjs
- Upgrading verser2 beyond current active target
- Changing runner runtime behavior except where topology invariants required it
- Removing or archiving standalone `packages/verser` or `packages/bpmux`
- Broad Docker/Kubernetes BDD (adapter package tests and builds passed under `test:packages-no-concurrent`)
- Python current-contract BDD (no new Python refapp/scenario introduced)
- Bun BDD (no Bun-specific refapp/scenario introduced)

## Final State

All 4 phases completed and manually verified. Track merged via PR #11. Verser2 is the unconditional active Manager/STH connectivity implementation. Legacy `@scramjet/verser` and `@scramjet/bpmux` remain as standalone buildable workspace packages for external users but are no longer imported or depended upon by any active Transform Hub runtime package.

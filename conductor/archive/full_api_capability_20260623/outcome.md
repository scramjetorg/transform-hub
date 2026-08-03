# Outcome: Full API Capability via Verser2 Forwarding

## Summary

Completed PR #34, `Full API capability via Verser2 forwarding`, for API forwarding correctness across Hub/STH, Manager, MultiManager, and sequence RPC routes.

The track implemented allowed Verser2 `308` route decision resolution into tunnels while preserving `308` as semi-deny behavior for disallowed external upward API requests.

## What Was Done

- Added focused BDD coverage for full API Verser2 forwarding.
- Added Manager/MultiManager aggregation fixtures for routed sequence API scenarios.
- Implemented hop-by-hop request and response header sanitization, including `Connection`-nominated headers.
- Added reusable routed redirect parsing and route forwarding policy helpers.
- Implemented v2 instance RPC forwarding for `/api/v2/instances/:instanceId/rpc/*`.
- Implemented allowed Manager and MultiManager downward tunneling.
- Implemented authorized sequence/runtime-originated upward route resolution while preserving external API-originated upward `308` responses.
- Added route-domain trust validation and spoofing protections for runtime-origin routing metadata.
- Added configurable waiting-stream defaults for runner/sequence-to-STH and STH-to-Manager upstream transports.
- Updated the PR description and track plan with final validation and review notes.

## Validation

Final validation recorded during the track included:

- Focused package tests for `api-server`, `host`, `manager`, `multi-manager`, `adapters-common`, `config`, and `sth-config` — passed under the repository memory guard.
- `npm run build:packages` — passed under the repository memory guard.
- Narrow Biome lint for changed files — passed.
- Focused Docker/JS BDD tag `@full-api-verser2-forwarding and not @ignore` — passed, 6 scenarios / 42 steps.
- Oracle final review follow-up reported no blockers after waiting-stream fallback and same-Hub proof fixes.

## Deferred Follow-ups

- Optional hardening around STH id validation before deriving route domains.
- Optional fully case-insensitive response `Connection` lookup tightening.
- Optional scoped STH domain tightening to one DNS label.
- Full package test suite, full build, and broad BDD suites were skipped as expensive; focused package, build, lint, and BDD validations covered the changed forwarding/config paths.

## Important Commits

- `164f8bd4` — initial Conductor artifact commit.
- `ae39ec61` — Phase 1 BDD and focused red contract checkpoint.
- `82e8bb74` — Phase 2 implementation checkpoint.

## Final State

The track is complete and archived. PR #34 is ready for manual review/merge.

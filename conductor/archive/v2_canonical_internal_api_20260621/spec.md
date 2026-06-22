# Specification: v2 Canonical Internal API

## Overview

Make REST API v2 the canonical internal API surface for Scramjet Transform Hub while preserving external v1 compatibility exactly. The track covers the open reported issues that affect Manager/MultiManager aggregation, Host health/readiness, runner Verser2 identity, sequence/runtime access, stream compatibility, and legacy API client behavior.

This is a full migration/refactor track in tests-first TDD mode. Internal code should stop adding new dependencies on v1 paths and should prefer `@scramjet/rest-api2` route contracts and clients. External v1 endpoints remain legacy compatibility surfaces and must continue to behave as existing clients expect.

## Goals

- Preserve all external v1 endpoints and legacy response compatibility.
- Make v2 the canonical internal API for runner, host, manager, CLI/client, and sequence-facing access paths.
- Add v2-backed sequence context accessors `this.hubClient()` and `this.spaceClient()`.
- Preserve backwards compatibility for existing `this.hub` and `this.space` sequence code.
- Move the legacy v1 API client package toward a compatibility facade over v2, preserving existing method names and response shapes.
- Address open reported issues #23, #24, #26, #27, #28, and #29 within the track.
- Add new BDD coverage targeting roughly 90% of sequence-side and API-client-side behavior affected by this migration.

## Functional Requirements

- Host health/readiness:
  - Add or standardize Host v1 compatibility health/readiness behavior for `/api/v1/health` without breaking existing `/api/v1/load-check`, `/api/v1/version`, `/api/v1/config`, or `/api/v1/status` behavior.
  - Keep `/api/v2/health` as the canonical health route.

- Manager aggregation and metadata:
  - Manager aggregation must expose useful startup instance metadata, including at least instance ID, `instanceName` when present, sequence identity/name where available, and hub/location.
  - Aggregation should preserve metadata already available from hub-local APIs and runner handshake state.
  - Aggregation readiness behavior should be deterministic enough for downstream systems to poll or verify without arbitrary sleeps.

- Runner Verser2 identity:
  - Avoid unsafe duplicate default STH-local runner broker identities in multi-STH deployments.
  - Derive stable unique runner broker/host identity from the owning STH identity when the unsafe default is present.
  - Preserve explicit user-configured runner broker identity.

- Sequence runtime API:
  - Add v2-backed `this.hubClient()` and `this.spaceClient()` accessors to the app context.
  - Keep hub-level and space-level operations isolated.
  - Preserve existing `this.hub` and `this.space` behavior for backwards compatibility.

- Internal API migration:
  - Replace internal hardcoded `/api/v1` usage in runner/host/manager/client code with v2 route contracts or v2-backed clients where feasible.
  - Do not remove external v1 route handlers.
  - Do not introduce new internal v1 dependencies unless explicitly required for legacy compatibility.

- Legacy API client compatibility:
  - Keep existing v1 API client method names and public response shapes.
  - Internally delegate to v2 where possible through a compatibility facade.
  - Keep behavior compatible for Host, Manager, Middleware, and MultiManager client flows affected by this track.

- Stream compatibility:
  - Preserve the fix/regression coverage for streamed topic responses not explicitly setting forbidden `transfer-encoding` headers.
  - Defer the upstream Verser2 `flushHeaders()` issue to the final phase; keep local compatibility behavior until upstream support is available.

## Non-Functional Requirements

- Use tests-first TDD where feasible for every behavior change.
- Prefer small, reviewable changes and narrow validations.
- Reuse shared packages such as `@scramjet/rest-api2`, `@scramjet/api-router`, `@scramjet/types`, and `@scramjet/symbols` before adding local abstractions.
- Maintain runtime protocol compatibility across Node, Python, and Bun wrappers.
- Avoid full Docker/Bdd validation unless required by the phase; add targeted BDD scenarios for sequence/API-client behavior.
- Keep v1 compatibility changes explicit and covered by tests.

## Acceptance Criteria

- Existing external v1 API tests continue to pass unchanged or with compatibility-preserving assertions.
- New Host v1 health/readiness compatibility is tested.
- Manager instance aggregation exposes friendly startup metadata and hub/location information.
- Manager aggregation readiness has deterministic tests and documented behavior.
- Multi-STH runner Verser2 identity no longer defaults to a duplicate `sth.default.runner.broker.host` host identity when host identity is available.
- `this.hubClient()` and `this.spaceClient()` are available in sequence app context and are v2-backed.
- Existing `this.hub` and `this.space` sequence code remains backwards compatible.
- Legacy API clients preserve their public method names and response shapes while using v2 internally where possible.
- New BDD tests cover sequence/client migration behavior with a target of roughly 90% of the affected sequence and API-client side scenarios.
- Stream regression tests for `transfer-encoding` and missing `flushHeaders()` remain in place.

## Out of Scope

- Removing public v1 endpoints.
- Breaking existing sequence code that uses `this.hub` or `this.space`.
- Replacing Verser2 internals upstream in this repository.
- Full redesign of Manager/MultiManager topology beyond the aggregation/readiness and API migration needs of this track.
- Broad formatting or unrelated dependency churn.

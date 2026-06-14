# Upstream verser2 API Availability and Auth Report

## Observed Transform Hub use case

Phase 2 needs to replace Manager/MultiManager/STH legacy `@scramjet/verser` and `@scramjet/bpmux` connectivity with verser2 Host/Broker/Guest roles:

- Manager/MultiManager owns the TLS HTTP/2 Host.
- STH connects outbound as Broker.
- STH also registers a Guest route for Manager-callable STH APIs.
- Manager routes requests to STH through Broker request helpers and route-readiness gates.

## Failing or missing verser2 behavior

Initial public npm registry checks could not resolve the required TypeScript packages. Follow-up inspection found a local upstream checkout at `/tmp/opencode/verser2` with the expected package sources and documentation. The packages are intended to be consumed from GitHub Packages under the `@signicode` scope, not from the public npm registry.

Public registry checks returned `E404 Not Found` for:

- `@signicode/verser2-host`
- `@signicode/verser2-guest-node`
- `@signicode/verser-common`

The checkout confirms authoritative declarations and docs for:

- `createVerserHost()`
- `createVerserBroker()`
- `createVerserNodeGuest()`
- `broker.request(...)`
- `waitForRoute(...)`
- `authorizeRegistration(context)`
- TLS/mTLS configuration options
- streaming request/response body contracts

## Affected package/API

Expected upstream packages/APIs and source packages:

- `@signicode/verser-common`: shared types for route IDs, request/response bodies, TLS options, errors, and lifecycle.
- `@signicode/verser2-guest-js-common`: shared JavaScript Guest foundations used by Node/Bun packages.
- `@signicode/verser2-host`: Host creation, TLS/mTLS, registration authorization, route state.
- `@signicode/verser2-guest-node`: Node Broker/Guest creation, route registration, route readiness, routed requests.

## Minimal desired change

Configure Transform Hub to resolve the `@signicode` scope from GitHub Packages using a local or CI-provided `GITHUB_PACKAGES_TOKEN`, and validate access before adding verser2 dependency wiring. The token must not be committed and must not replace the broad existing local `gh` login.

The package checkout already provides authoritative examples covering:

1. creating a TLS Host with optional client mTLS and `authorizeRegistration(context)`;
2. creating a Broker with CA trust and client identity options;
3. creating a Node Guest with explicit routed domains;
4. waiting for route readiness before a Broker request;
5. sending routed HTTP-like requests with streaming request/response bodies;
6. closing Host, Broker, and Guest resources cleanly.

## Blocking impact on the rollout

Phase 2 implementation remains blocked until the required GitHub Packages can be resolved with authenticated npm metadata. Implementing against guessed or local checkout-only package paths would create brittle Transform Hub-specific workarounds and likely violate the track requirement to use published Guest/Broker packages instead of local reimplementations.

## Temporary workaround

No safe production workaround is acceptable without explicit approval.

Added local validation path:

- root `.npmrc` maps `@signicode` to `https://npm.pkg.github.com` using `${GITHUB_PACKAGES_TOKEN}`;
- `npm run check:verser2-packages` verifies `GITHUB_PACKAGES_TOKEN`, uses it as ephemeral `GH_TOKEN`/`NODE_AUTH_TOKEN`, leaves persisted `gh` auth untouched, and checks required package metadata.

Authenticated package resolution now succeeds for the Phase 2 packages at `0.0.0-sha.cab9d3c36bec`:

- `@signicode/verser-common`
- `@signicode/verser2-guest-js-common`
- `@signicode/verser2-host`
- `@signicode/verser2-guest-node`

The `.env` token can read package metadata but does not have private repository metadata access; the helper treats repository metadata as informational and package metadata as the authoritative dependency-resolution gate.

Follow-up authenticated package checks found local peer support published at `0.0.0-sha.f2c83d754654`. Transform Hub now pins the Phase 2 `@signicode` packages to that SHA so `@signicode/verser2-host` exposes `host.attachLocalBroker()` and `host.attachLocalGuest()` for colocated Manager/STH peers.

The only safe local work that can continue before the upstream artifacts are available is preparatory work that does not depend on concrete verser2 signatures, such as:

- defining internal transport interfaces around the already-approved contracts;
- adding tests for current Manager/STH request-forwarding behavior;
- adding tests for reconnect/disconnect/route-readiness expectations at the abstraction boundary;
- keeping legacy `@scramjet/verser` behavior behind a temporary implementation.

These preparatory steps do not replace the required upstream packages and should not be treated as the actual verser2 transport implementation.

---

## Python package distribution blocker during Phase 3

### Observed Transform Hub use case

Phase 3 needs `packages/runner-python` to use the published Python verser2 Guest/Broker implementation for:

- Python sequence → STH API calls through Broker/request semantics;
- STH → Python sequence API exposure through an ASGI Guest;
- explicit runner route domains, CA trust, optional client identity files, and lease/waiting-stream settings from runner boot config.

Transform Hub can parse and map the needed boot config locally, but the runtime must not vendor or reimplement the Python verser2 transport.

### Failing or missing verser2 behavior

The upstream source checkout contains `packages/verser2-guest-python` with the expected public API (`verser2_guest_python`, `create_verser_broker`, `create_verser_guest`, `VerserBrokerResponse`, ASGI Guest support, TLS options, and explicit `routed_domains`). However, the package is currently available to this development flow as an npm/GitHub Packages artifact, not as a directly installable Python distribution from PyPI.

Local availability check failed:

```sh
python3 -m pip index versions verser2-guest-python
# ERROR: No matching distribution found for verser2-guest-python
```

### Affected package/API

- Upstream source package: `@signicode/verser2-guest-python` / `packages/verser2-guest-python`.
- Python import expected by Transform Hub: `verser2_guest_python`.
- Public APIs needed: `create_verser_broker(...)`, `create_verser_guest(...)`, Broker request helpers, ASGI Guest routing, TLS CA/client identity options, and explicit `routed_domains`.

### Minimal desired change

Provide a clear, CI-safe installation and versioning path for the Python package, either by:

1. publishing an installable Python distribution/wheel for `verser2-guest-python`; or
2. documenting and supporting consumption of the Python wheel from the npm/GitHub Packages artifact, including how Transform Hub should install it during development, CI, packaging, and runtime image builds.

The package version should be aligned with the `@signicode/verser2-guest-python` npm artifact so Transform Hub can pin it reproducibly alongside the TypeScript verser2 packages.

### Blocking impact on the rollout

Python runtime wiring beyond local boot-config and adapter/helper tests is blocked. Transform Hub should not ship a runtime path that imports `verser2_guest_python` unless the dependency can be installed in package tests, CI, and runtime packaging without relying on an ad hoc local checkout.

### Temporary workaround

No production workaround is acceptable without explicit approval. Safe preparatory work may continue only where it does not import the unavailable package at module import time and uses injected fakes in tests.

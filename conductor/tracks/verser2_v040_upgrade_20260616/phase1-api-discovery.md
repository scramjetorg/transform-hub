# Phase 1 API Discovery: verser2 v0.4.0

## Package availability

Authenticated GitHub Packages resolution succeeds through the repository helper:

```text
npm run check:verser2-packages
```

Result: `@signicode/verser-common`, `@signicode/verser2-guest-js-common`, `@signicode/verser2-host`, and `@signicode/verser2-guest-node` all resolve, with newest published version `0.4.0`.

Direct unauthenticated `npm view @signicode/verser2-*` fails with `401 Unauthorized`; the approved recovery path is recorded in `conductor/known-solutions.md` under “Signicode GitHub Packages auth for verser2”.

Authenticated package tarball inspection also confirmed `0.4.0` availability for:

- `@signicode/verser-common@0.4.0`
- `@signicode/verser2-guest-js-common@0.4.0`
- `@signicode/verser2-host@0.4.0`
- `@signicode/verser2-guest-node@0.4.0`
- `@signicode/verser2-guest-bun@0.4.0`
- `@signicode/verser2-guest-python@0.4.0`

## Current v0.3.1 integration assumptions

Active workspace manifests pin verser2 packages to `0.3.1` in:

- `packages/host/package.json`
- `packages/manager/package.json`
- `packages/multi-manager/package.json`
- `packages/runner/package.json`
- `packages/runner-node/package.json`
- `packages/runner-bun/package.json`
- `packages/runner-python/package.json`

`package-lock.json` pins all corresponding tarballs and transitive verser2 package dependencies to `0.3.1`.

`packages/runner-python/scripts/install-deps.sh` hard-codes:

- `VERSER2_VERSION="0.3.1"`
- `VERSER2_WHEEL="verser2_guest_python-0.3.1-py3-none-any.whl"`
- `VERSER2_WHEEL_SHA256="c1529bef856959c0baab2f0c012a052788b1a725ca2be75baf51c557f741a212"`

## v0.4.0 API findings

### Native 307/308 redirects

`@signicode/verser2-guest-node@0.4.0` and `@signicode/verser2-guest-bun@0.4.0` add Broker options:

- `internalRedirectReplayBufferBytes?: number`
- `maxInternalRedirects?: number`

The Node Broker README states Broker request paths follow internal `307` and `308` redirects by default when the response `Location` hostname exactly matches an advertised verser2 route. The redirected request is resolved through the Broker route table, preserves method, headers, path/query, and replayable body, and is bounded by `maxInternalRedirects` and `internalRedirectReplayBufferBytes`. If the body cannot be replayed or the target hostname is not advertised, the original redirect response is returned unchanged.

This supports replacing the Manager dummy/internal follow dispatch with native 308-style redirect responses in later phases, while retaining route classification and direct STH-to-STH constraints.

### Upstream Host federation

`@signicode/verser2-host@0.4.0` adds Host federation and upstream APIs:

- `VerserHostId`
- `FederatedRouteRegistration`
- `VerserHostFederationHandshake`
- `VerserHostFederationAuthorizationCallback`
- `VerserHostOptions.hostId?: string`
- `VerserHostOptions.maxFederationHopCount?: number`
- `VerserHostClientAuthTlsOptions.authorizeFederation?: VerserHostFederationAuthorizationCallback`
- `VerserHostUpstreamOptions`
- `VerserHostUpstreamStatus`
- `VerserHostUpstreamHandle`
- `host.connectUpstream(options)`
- `host.getUpstreams()`
- `host.getFederatedRouteCandidates(...)`
- `host.setImportedFederatedRoutes(...)`
- `host.removeImportedFederatedRoutes(...)`

The Host README describes these as outbound upstream Host links for route-aware federation and route exchange with another Host. This is the v0.4.0 primitive to evaluate for replacing Transform Hub local forwarding and aligning Manager/STH/MultiManager communication with upstream-host routing.

### Compatibility and limitations

No breaking public signature changes were identified for current basic calls used by Transform Hub:

- `createVerserHost(options)` remains available.
- `host.attachLocalGuest(options)` and `host.attachLocalBroker(options)` remain available.
- `createVerserBroker(options)` remains available.
- `createVerserNodeGuest(options)` remains available.
- `createVerserBunGuest(options)` remains available.
- Broker `request`, `getRoutes`, and `waitForRoute` remain available.

v0.4.0 still documents that WebSocket upgrade, CONNECT tunneling, trailers, and informational responses are not forwarded by the Host/Node Guest surface. The track should not treat “tunneling” as generic HTTP CONNECT tunneling. For this track, “tunneled requests” means sequence-originated requests to Space/STH/Manager endpoints flowing over the owning STH hub-level verser2 Host, through Manager upstream Host federation where needed, and through native 308 redirect-following to reach other Hosts/STHs.

New error codes include:

- `upstream-unavailable`
- `route-loop`
- `authorization-denied`
- `unsafe-retry`

These may need mapping in Transform Hub transport error handling if Host federation is integrated.

## Implementation implications

- Phase 2 can use native 308 responses for follow-classified Manager routes, relying on v0.4.0 Broker redirect following.
- Phase 3 should focus on `host.connectUpstream()`, federation route metadata, sequence/runtime Broker/fetch helpers, and native 308 redirect-following for sequence-to-Space/STH/Manager requests rather than generic HTTP CONNECT tunneling.
- Existing config/types should gain host federation settings only when used by Transform Hub code: host IDs, max federation hops, upstream IDs/URLs, TLS trust, and federation authorization policy.
- Python upgrade still requires updating the GitHub release wheel version and SHA-256 in `packages/runner-python/scripts/install-deps.sh`.

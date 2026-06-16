# Native 308 Redirect Contract

## Purpose

This document replaces the earlier redirect-readiness assumption from `verser2_rollout_20260613/route-forwarding-classification.md` for this upgrade track. In verser2 v0.4.0, Broker request paths follow internal `307` and `308` redirects when the redirect `Location` hostname exactly matches an advertised verser2 route. Transform Hub can therefore stop treating Manager follow routing as an internal dispatch problem and instead return a native, verser2-followable redirect for follow-classified routes.

The Manager route classifier remains the source of truth for whether a request is safe to follow, must stay Manager-owned, must use Manager multiplexing, or remains unsupported bidirectional behavior.

## v0.4.0 redirect behavior Transform Hub relies on

`@signicode/verser2-guest-node@0.4.0` documents this Broker behavior:

- Broker request paths follow internal `307` and `308` redirects by default.
- Redirect following only happens when the response `Location` hostname exactly matches an advertised verser2 route.
- The redirected request is resolved through the Broker route table.
- The original method, headers, path/query, and replayable body are preserved.
- Redirect following is bounded by `maxInternalRedirects` and `internalRedirectReplayBufferBytes`.
- If the body is too large to replay or the target hostname is not advertised, the original redirect response is returned unchanged.

Transform Hub should use `308 Permanent Redirect` for Manager follow decisions because existing follow-classified state-changing single-owner routes must preserve the original HTTP method and request body.

## Manager follow redirect response

For a follow-classified Manager API request from an external/API caller, Manager should return:

- HTTP status: `308`
- `Location`: `http://<routeDomain><targetPathAndQuery>`
- `x-scramjet-route-decision`: `follow`
- `x-scramjet-route-domain`: the target route domain, for diagnostics

The `Location` scheme is intentionally `http:`. The URI is not intended for DNS/public network resolution by ordinary clients; it is a route identity consumed by verser2 Broker redirect-follow behavior. Broker helpers resolve the hostname from the advertised verser2 route table instead of DNS.

The redirect target path must preserve the original query string unless the classifier already produced a target path with an explicit query.

## Direct STH-originated payloads

Requests identified as STH-originated by the existing CPM marker (`cpm: true`) must continue to receive direct route metadata rather than Manager acting as a data-plane proxy. This preserves the direct STH-to-STH constraint:

- Manager may coordinate route discovery.
- Manager must not forward STH-originated single-target payloads through its own data plane.
- STH callers should use the target route directly once they receive route metadata.

The existing `409` route metadata response remains valid for this case until a later STH-to-STH route discovery contract replaces it.

## Manager-owned and multiplex routes

Native 308 redirect behavior is only for `follow` decisions. These cases must not be converted to redirects:

- `manager-owned`: Manager is source of truth or owns the control action.
- `manager-multiplex`: Manager intentionally remains in the stream path for aggregation, fan-in/fan-out, or topic semantics.
- `unsupported-bidirectional`: The route needs a dedicated protocol or upstream capability before being safely enabled.

## Unavailable or invalid targets

Manager should not emit a native redirect unless it has enough target metadata to build a route URI:

- route domain is known;
- target path is known or can be derived from the current request URL;
- target STH is connected and healthy, as already checked by `handleRequestToSTH`.

If the target STH is missing or inactive, the existing `404` / `503` behavior remains correct. If a follow decision lacks route-domain metadata, Manager should return a clear route-decision error rather than falling back to dummy internal forwarding.

## Tunneling clarification for this track

In this track, “verser tunneling” means tunneled application requests made from sequences to Space/STH/Manager endpoints over the hub-level verser2 Host, with the Manager connected as an upstream Host and with v0.4.0 Broker redirect following used to reach other Hosts after native `308` redirects.

The intended request path is:

```text
sequence/runtime Broker or fetch helper
  -> owning STH hub-level verser2 Host
  -> Manager upstream Host federation when the target is outside the local STH
  -> native 308 redirect-follow when Manager resolves a single target route on another Host/STH
  -> target Host/STH route
```

This preserves the direct STH-to-STH data-plane constraint: Manager coordinates ownership and can emit route-aware redirects, but payload transfer should happen through verser2 route following/upstream Host routing instead of Manager-local HTTP forwarding.

## Unsupported generic CONNECT tunneling assumption

v0.4.0 adds Host federation/upstream routing through `host.connectUpstream()`, but the public Host/Guest type surface still states that WebSocket upgrade, CONNECT tunneling, trailers, and informational responses are not forwarded. This Phase 2 redirect contract does not enable CONNECT, `/platform`, or `/inout` bidirectional paths.

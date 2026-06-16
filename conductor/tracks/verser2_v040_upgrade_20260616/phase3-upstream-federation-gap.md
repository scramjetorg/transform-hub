# Phase 3 Upstream Federation Gap

## Resolution

Resolved upstream in `signicode/verser2#24` / PR `signicode/verser2#25` and released as verser2 `v0.4.1`.

After upgrading Transform Hub active verser2 packages to `0.4.1`, the previously ignored no-hub BDD proof now passes as an active scenario:

- `bdd/features/verser2/VERSER2-001-isolated-routing.feature`
- Scenario: `Broker follows a native 308 redirect across an upstream Host`
- Tags: `@phase3 @upstream-fixed`

Validation:

```bash
NODE_OPTIONS="--max-old-space-size=1536" npm run test:bdd-ci-verser2
```

The original gap notes below are retained as historical context for why the patch upgrade was required.

## Summary

The Phase 3 implementation target was blocked by verser2 v0.4.0 Host federation request directionality. `host.connectUpstream()` successfully established Host-to-Host federation and imported route advertisements from the upstream Host, but a Broker connected to the downstream STH-local Host could not dispatch a request upward to an imported upstream route.

This prevents the intended sequence-to-space path from working as designed:

```text
sequence/runtime Broker
  -> owning STH-local verser2 Host
  -> Manager upstream Host federation
  -> Manager native 308 redirect to target STH route
  -> target STH route
```

## Reproduction

An isolated no-hub BDD scenario was added and initially marked ignored:

- `bdd/features/verser2/VERSER2-001-isolated-routing.feature`
- Scenario: `Broker follows a native 308 redirect across an upstream Host`
- Original tags: `@phase3 @upstream-gap @ignore`
- Current tags after v0.4.1 fix: `@phase3 @upstream-fixed`

The scenario starts two raw verser2 Hosts:

1. `manager` Host with local routes:
   - `manager.local.test` responds with native `308 Location: http://remote-sth.local.test/...`
   - `remote-sth.local.test` responds with a body
2. `sth` Host calls `connectUpstream()` to the `manager` Host
3. A Broker connects to `sth` and requests `manager.local.test`

Observed validation command:

```bash
NODE_OPTIONS="--max-old-space-size=1536" npm run test:bdd-ci-verser2
```

Observed failure before the scenario was marked ignored:

```text
VerserError: [upstream-unavailable] No federated route candidates are available (targetId=bdd-manager-local-test)
```

Earlier in the same scenario, omitting a Host federation ID produced:

```text
VerserError: [invalid-registration] Host federation requires a configured hostId
```

That Host ID requirement is valid upstream behavior. The blocking issue is the later request-dispatch failure after the upstream connection succeeds.

## Root-cause evidence

Inspection of `@signicode/verser2-host@0.4.0` installed code shows:

- `connectUpstream()` opens upstream route and request streams and imports upstream route advertisements.
- `routeLocalRequest()` tries federated dispatch when the target Guest is not local.
- `tryRouteLocalRequestToFederatedHost()` iterates imported route candidates but then calls `tryAcquireFederatedRequestStream(candidate.nextHopHostId, ...)`.
- `acquireFederatedRequestStream()` looks in `inboundFederationHosts`, not `upstreamLinks`.

In this direction, the downstream STH-local Host has the Manager in `upstreamLinks`, not `inboundFederationHosts`, so it cannot acquire a request stream for upward dispatch to the upstream Manager Host.

## Impact on this track

- Native local `308` redirect-following still works and remains covered by the active isolated BDD gate.
- Manager external/API native `308` redirects still work and remain Phase 2 behavior.
- The Phase 3 target path cannot be completed with public verser2 v0.4.0 APIs as currently exposed/implemented.
- No Transform Hub local proxy workaround should be added in this track before upstream behavior is clarified or fixed, because that would violate the direct STH-to-STH data-plane constraint.

## Required upstream capability

One of these upstream behaviors is needed:

1. A Broker request received by a downstream Host can dispatch to imported upstream route candidates over the upstream Host federation request stream; or
2. The supported federation topology is inverted and documented, with Manager connecting to each STH-local Host such that request dispatch uses inbound federation hosts; or
3. A public Host/Broker API provides a route-aware upstream request primitive suitable for sequence/runtime Broker/fetch callers.

Until one of these is available, Phase 3 implementation remains blocked at the upstream verser2 capability boundary.

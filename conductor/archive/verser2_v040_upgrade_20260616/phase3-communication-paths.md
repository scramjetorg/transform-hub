# Phase 3 Communication Path Classification

## Purpose

Phase 3 narrows “upstream Host tunneling” to the request path defined in `native-redirect-contract.md`: sequence/runtime-originated requests should use the owning STH hub-level verser2 Host, Manager as an upstream Host, and native verser2 `307`/`308` redirect-following to reach another STH route when Manager resolves a single owner.

This document classifies existing Transform Hub forwarding paths before implementation so Phase 3 does not accidentally treat generic local HTTP forwarding, CONNECT tunneling, runner control streams, or Manager multiplexers as equivalent tunnel candidates.

## Classification legend

- **Sequence-to-space tunnel candidate**: path should eventually allow a sequence/runtime Broker or fetch helper to reach Space/STH/Manager endpoints through the STH-local verser2 Host and Manager upstream federation.
- **Redirect-only**: path should emit or consume native `308` redirects but should not become a Manager-local proxy.
- **Manager-owned/multiplexed**: Manager must stay source of truth or stay in the stream path for aggregation/fan-in/fan-out semantics.
- **Retained fallback**: local HTTP forwarding or in-process routing that remains necessary for non-verser2/runtime compatibility.
- **Unsupported/deferred**: cannot be represented by current public verser2 v0.4.0 Host/Guest APIs.

## Path table

| Path | Entrypoint | Current behavior | Classification | Phase 3 action |
| --- | --- | --- | --- | --- |
| Sequence/runtime → STH-local Host route | `packages/host/src/lib/runner-verser2-host-peers.ts:13` | Attaches an STH-local verser2 Broker and local Guest. The local Guest exposes the STH API server under the STH route domain. | Sequence-to-space tunnel candidate | Keep as the local hub-level Host ingress. Extend only after Manager upstream Host federation is wired for remote routes. |
| Sequence/runtime Broker/fetch request routing | `packages/runner-node/src/host-client.ts`, `packages/runner-bun/src/verser2-runtime.ts`, runner-python runtime | Runtimes create verser2 Brokers from boot config to call Host/STH endpoints. | Sequence-to-space tunnel candidate | Route remote Space/STH targets by relying on STH-local Host route table plus upstream Manager federation; avoid runtime-specific protocol divergence. |
| STH API `/api/v1/cpm/api/v1/*` Space proxy | `packages/host/src/lib/api/host-api.ts:206` | Host receives Space requests and calls `CPMConnector.makeHttpRequestToCpm()`, which creates an HTTP request to the Manager route domain through the CPM Broker agent. | Sequence-to-space tunnel candidate for sequence-originated Space calls; retained fallback for direct local Host API callers | Prefer Broker/Host upstream routing for sequence-originated requests. Keep ordinary Host API proxy behavior until a safe caller distinction and fallback contract exists. |
| STH → Manager HTTP request helper | `packages/host/src/lib/cpm-connector.ts:675` | Builds `http://<manager-route-domain>/api/v1/<path>` and uses the verser2 Broker-backed HTTP agent. | Sequence-to-space tunnel candidate | This is the immediate seam for sequence-to-space calls that target Manager/Space. It can consume Manager `308` redirects if the Broker route table imports remote STH routes through upstream federation. |
| Manager `/api/v1/sth/:id/*` follow routing | `packages/manager/src/lib/manager.ts:523`, `packages/manager/src/lib/route-classifier.ts:37` | Classifies single-owner STH paths and emits native `308` redirects for external/API callers. Returns direct route metadata for `cpm: true` STH-originated payloads. | Redirect-only | Preserve Phase 2 behavior. Do not reintroduce Manager-local HTTP forwarding. Phase 3 should make STH-originated callers able to use route metadata/upstream routes directly. |
| Manager direct route metadata for CPM-marked calls | `packages/manager/src/lib/route-classifier.ts:79` | `cpm: true` returns `409` route metadata instead of redirect so Manager does not proxy STH-originated payloads. | Redirect-only / sequence-to-space transition seam | Replace or augment only when STH callers can follow remote route domains through upstream Host federation without Manager data-plane proxying. |
| Manager topics | `packages/manager/src/lib/route-classifier.ts:56`, `packages/manager/src/lib/manager.ts` topic handlers | Manager owns live topic fan-in/fan-out and aggregated service-discovery behavior. | Manager-owned/multiplexed | Do not tunnel as a single-owner route. Leave as Manager stream path unless a dedicated topic protocol is designed. |
| Manager-owned state/storage/control routes | `packages/manager/src/lib/route-classifier.ts:66`, Manager API handlers | Manager owns storage, connected-STH registry, disconnect policy, load, health, logs aggregation, etc. | Manager-owned/multiplexed | Keep Manager-local. Do not redirect/tunnel. |
| MultiManager → Manager routing | `packages/multi-manager/src/lib/multi-manager.ts:280`, `packages/multi-manager/src/lib/multi-manager.ts:301` | MultiManager attaches local Broker/Guest peers for managed Managers and delegates `/cpm/:id/*` to the selected Manager router. | Manager-owned/multiplexed | Keep as Manager selection/orchestration. Upstream Host federation should not bypass sub-Manager ownership. |
| API server generic routed forward helper | `packages/api-server/src/handlers/routed-forward.ts:69` | Generic streaming request/response forwarding over an injected routed transport, rejects CONNECT/upgrade and informational responses. | Retained fallback / reusable primitive | Keep for runner RPC and future focused uses; it is not itself the sequence-to-space architecture. |
| API server generic URL forwarder | `packages/api-server/src/handlers/forward.ts:14` | Classic local HTTP proxy to selected URL, piping request and response. | Retained fallback | Keep for non-verser2 and legacy exposed RPC fallback until all supported runtime paths are proven on verser2. |
| Host exposed RPC via API `/api/v1/rpc` | `packages/host/src/lib/api/host-api.ts:133` | Selects an exposed instance and calls `instance.forwardRpcRequest()` when verser2 runner transport is available, then falls back to classic HTTP forwarding. | Retained fallback; not Phase 3 sequence-to-space | Do not confuse Host→runner RPC with sequence→Space tunnel. Existing runner RPC path remains separate. |
| Instance API `/rpc` | `packages/host/src/lib/api/instance-api.ts:74` | Tries verser2 runner RPC forwarding, then falls back to `router.forward()` to `csi.rpcUrl`. | Retained fallback; not Phase 3 sequence-to-space | Keep unchanged unless Phase 4/5 explicitly removes proven obsolete runner RPC forwarding. |
| Runner control/data streams | `packages/host/src/lib/runner-transport.ts:176` | Host opens multiple long-lived verser2 routes for stdin/stdout/stderr/control/monitoring/log/input/output. | Retained fallback / unsupported for generic tunnel | Do not replace with generic CONNECT or redirect behavior. These are runner lifecycle streams, not sequence-to-space HTTP fetches. |
| `/platform` duplex stream | `packages/manager/src/lib/route-classifier.ts:132`, `packages/host/src/lib/api/host-api.ts:105` | Dedicated duplex Manager/STH control stream. | Unsupported/deferred | v0.4.0 public APIs do not expose generic CONNECT/upgrade/bidirectional tunneling. Keep unsupported for native redirect. |
| Instance `/inout` | `packages/manager/src/lib/route-classifier.ts:178` | Coupled duplex stream. | Unsupported/deferred | Keep unsupported until a dedicated protocol exists. |

## Implementation implications

1. The first concrete Phase 3 target is **STH-originated Space/Manager requests**, not Host→runner RPC or runner lifecycle streams.
2. Manager `308` redirect responses already cover external/API callers. STH-originated calls still deliberately receive route metadata, so Phase 3 must make the STH caller able to turn that metadata into a direct verser2 route request.
3. Manager must remain out of the data plane for single-owner STH payloads. Any local HTTP proxy fallback must be documented as retained compatibility, not the target tunnel architecture.
4. Upstream Host federation (`host.connectUpstream()`) is the intended route distribution mechanism. Generic CONNECT, WebSocket upgrade, trailers, informational responses, `/platform`, and `/inout` remain out of scope.
5. Runner transports and exposed RPC are important existing verser2 users, but they are not the sequence-to-space tunnel lane for this phase.

## Startup-order limitation

Sequence-to-space routing depends on the STH-local hub-level verser2 Host being connected upstream to the Manager/MultiManager Host before the sequence runtime receives and uses its runner transport configuration.

If a sequence is started in a Hub before that Hub has connected to Manager, the sequence should be treated as **local-only for Space API access**. Its runtime may still call local Hub/STH routes that are available through the local runner Host, but it cannot rely on Manager-owned Space API routes or remote STH route discovery until a new sequence/runtime is started after Manager connectivity and upstream Host federation are established.

This is an intentional Phase 3/4 limitation, not a fallback proxy requirement. The current design does not retroactively upgrade already-started sequence runtimes when the Hub later connects to Manager, and Manager must not compensate by becoming a data-plane proxy for those earlier runtimes.

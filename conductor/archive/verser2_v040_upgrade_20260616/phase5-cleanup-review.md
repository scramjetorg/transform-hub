# Phase 5 Cleanup Review

## Decision

Do not remove the API-server forwarding helpers in Phase 5.

After Phase 4 validation, the forwarding helpers are still active compatibility and runner-RPC paths, not obsolete sequence-to-space tunneling code:

- `packages/api-server/src/handlers/routed-forward.ts` is the primary Host-to-runner RPC forwarding primitive when a verser2 runner Broker is available.
- `packages/api-server/src/handlers/forward.ts` remains the classic HTTP fallback for Host/Instance RPC paths when the verser2 runner Broker is unavailable.
- Manager single-owner follow routing no longer uses dummy/internal data-plane forwarding; it emits native `308` redirects for external/API callers and route metadata for STH-originated calls.

Removing the API-server helpers now would break runner RPC fallback behavior, not just remove obsolete Manager redirect workarounds.

## Retained fallbacks

| Path | Status | Rationale |
| --- | --- | --- |
| `forwardRoutedRequest()` | Retained primary runner RPC path | Used by Host/CSI runner RPC forwarding through verser2. It rejects CONNECT, upgrade, trailers, and informational response behavior because the current supported RPC path is plain request/response, not generic bidirectional tunneling. |
| `createForwardController()` / `forward.ts` | Retained fallback | Used by Host and Instance RPC routes after the verser2 runner RPC attempt falls through. This preserves non-verser2 and not-yet-connected runner behavior. |
| Manager `unsupported-bidirectional` decisions | Retained explicit unsupported state | `/platform`, `/inout`, CONNECT, WebSocket upgrade, trailers, and informational responses remain outside the Phase 3/4 sequence-to-space lane. |
| Legacy `packages/verser` and `packages/bpmux` | No active-path removal in this track | They are legacy standalone packages. Runtime invariant checks verify no active path reintroduces legacy `@scramjet/verser`/BPMux communication outside standalone legacy packages. |

## Stale reference scan

- No tracked stale `packages/runner-python/__pypackages__/verser2_guest_python-0.3.1*` artifact was found.
- Active package manifests and the npm lockfile no longer pin active `@signicode/verser2-*` packages to `0.3.1`; remaining `0.3.1` matches are historical conductor notes or unrelated transitive dependency versions.
- Historical rollout-track references to dummy redirects and `0.3.1` remain intentionally historical and should not be edited as part of this v0.4.1 track.
- The active v0.4.1 track now documents the startup-order limitation: sequences started before their Hub connects to Manager are local-only for Space API access and should be restarted after Manager connectivity/upstream Host federation if Space API access is required.

## Phase 5 action

Phase 5 cleanup is documentation and classification only. No production forwarding code is removed in this phase because the inspected forwarding code is still active primary/fallback behavior or explicit unsupported-state handling.

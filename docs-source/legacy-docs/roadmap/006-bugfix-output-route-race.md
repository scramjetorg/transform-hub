# Bugfix: Output Route Race Condition

| Field | Value |
|-------|-------|
| Title | Fix output route race condition |
| Category | bugfix |
| Scope | packages/host, packages/api-server |
| Breaking | no |

## Problem Statement

The instance `/output` endpoint can serve fallback text before the real output stream route is attached. A fast consumer may receive the placeholder response and close the connection, missing the actual Sequence output entirely.

## Current Behavior

1. An instance starts.
2. The host creates the `/output` route immediately so the API surface is complete.
3. Until the runner finishes handshakes and the CSI controller binds the real output stream, the route may return a fallback string such as "Output not available yet."
4. If a consumer connects during this window, it receives the fallback text and treats it as the full response.

## Expected Behavior

- The `/output` endpoint should either block until the real stream is ready, or return a status code that tells the consumer to retry.
- Consumers using `si inst output` should never accidentally capture placeholder text as Sequence data.

## Proposed Change

1. In the host output handler, defer route registration until the CSI controller signals that the output stream is bound, or register a placeholder handler that returns `503 Service Unavailable` with a `Retry-After` header.
2. Alternatively, keep the route live but switch the internal pipe from a placeholder stream to the real runner stream atomically once handshakes complete.
3. Add a short timeout (for example, 5 seconds) so the consumer does not hang indefinitely.

## Backwards Compatibility

No breaking changes. Returning `503` instead of placeholder text is a safer behavior for well-written clients, and existing CLI polling loops already handle retries.

## Testing Plan

- Unit test: simulate a consumer hitting `/output` before the runner handshake completes and assert `503` or blocked stream.
- Integration test: start a Sequence and immediately run `si inst output`; verify no placeholder text appears in the captured output.

## References

- `packages/host/src/lib/csi-controller.ts`
- `packages/api-server/src/handlers/stream.ts`

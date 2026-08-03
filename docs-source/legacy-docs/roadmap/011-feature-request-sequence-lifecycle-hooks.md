# Feature Request: Sequence Lifecycle Hooks

| Field | Value |
|-------|-------|
| Title | Sequence lifecycle hooks |
| Category | feature-request |
| Scope | packages/host, packages/types, packages/runner |
| Breaking | no |

## Problem Statement

Today, Sequences are started and stopped by the host, but they cannot react to lifecycle transitions. Operators and sequence authors need hooks for initialization, graceful shutdown, health signaling, and post-crash cleanup.

## Current Behavior

- A Sequence runs until it ends or is killed. There is no `onStart`, `onStop`, or `onHealthCheck` contract.
- Cleanup logic must be crammed into the main function or handled externally.
- The host cannot ask a Sequence "are you ready?" before routing traffic to it.

## Expected Behavior

- Optional lifecycle hooks exported from a Sequence module:
  - `onStart(context)` fired after the runner connects but before input begins.
  - `onStop(context, reason)` fired on SIGTERM or host-initiated end, allowing async cleanup.
  - `onHealthCheck(context)` returning `{ healthy: boolean, message?: string }` surfaced via the instance health endpoint.
- Hooks are optional; Sequences without them behave exactly as they do today.

## Proposed Change

1. Extend the Sequence module contract so a default export can be an object:
   ```ts
   export default {
     main: async function* (input) { ... },
     onStart: async (ctx) => { ... },
     onStop: async (ctx, reason) => { ... },
     onHealthCheck: (ctx) => ({ healthy: true })
   };
   ```
2. In the runner, call `onStart` after the control stream handshake and before opening the input gate.
3. In the runner, intercept shutdown signals and await `onStop` with a configurable timeout.
4. In the host health endpoint, if `onHealthCheck` exists, call it and include the result in the JSON response.
5. Add TypeScript types for the new hooks in `packages/types`.

## Backwards Compatibility

No breaking changes. Hooks are optional. Existing function-only exports continue to work.

## Testing Plan

- Unit tests for runner hook invocation order.
- Integration test: a Sequence with `onStop` that flushes a buffer; verify the flush completes before the instance disappears.
- Integration test: a Sequence with `onHealthCheck` returning `false`; verify the health endpoint reflects it.

## References

- `docs/read-more/how-to-write-a-sequence.md`
- `packages/runner/src/runner.ts`
- `packages/host/src/lib/csi-controller.ts`

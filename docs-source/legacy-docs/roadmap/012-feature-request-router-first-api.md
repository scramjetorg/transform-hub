# Feature Request: Router-First API

| Field | Value |
|-------|-------|
| Title | Router-first API for Sequence-exposed HTTP routes |
| Category | feature-request |
| Scope | packages/api-server, packages/types, new router package |
| Breaking | no |

## Problem Statement

Sequences that want to expose custom HTTP endpoints today must manually create a server or rely on external sidecars. A first-class router API inside STH would let Sequences declare routes that the host serves directly, keeping networking unified and observable.

## Current Behavior

- Sequences can only communicate via input/output streams, topics, and events.
- If a Sequence needs an HTTP API surface, it must bind its own port or run a separate server.
- This fragments observability and complicates deployment in restricted environments.

## Expected Behavior

- A Sequence can declare routes using a small router API provided by the host:
  ```ts
  this.router.get('/orders/:id', async (req, res) => { ... });
  this.router.post('/orders', async (req, res) => { ... });
  ```
- The host mounts these routes under the instance path, for example `/api/v1/instance/:id/routes/orders/:id`.
- The router supports standard methods, path parameters, and JSON body parsing.

## Proposed Change

1. Design a minimal router interface (`IRouter`) in `packages/types`.
2. In `packages/api-server`, add a dynamic route mount point under `/instance/:id/routes/*`.
3. When an instance starts, if it registers routes, forward requests to the runner via an internal stream or IPC channel.
4. Provide a helper package (for example, `@scramjet/router`) that wraps the low-level stream into familiar `req`/`res` shapes.
5. Update Sequence templates to show a router example.

## Backwards Compatibility

No breaking changes. Router usage is entirely opt-in. Existing Sequences without routes are unaffected.

## Testing Plan

- Unit test: mock runner route registration and verify the host mounts the correct path.
- Integration test: deploy a Sequence with two routes, call them via HTTP, and assert correct responses.
- Load test: verify the router path does not materially impact throughput of the existing output stream.

## References

- `docs/interfaces/API-reference.md`
- `packages/api-server/src/index.ts`
- `packages/types/src/index.ts`

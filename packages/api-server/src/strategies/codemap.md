# packages/api-server/src/strategies/

## Responsibility

Pluggable target selection strategies for HTTP request forwarding controllers. Implement the `ForwardStrategy` contract used by `createForwardController()` to pick a backend URL for each incoming request.

## Modules

### `round-robin.ts` — `roundRobinStrategy<X>(req, urls): [X, string]`

Selects a target URL in round-robin fashion using a module-level counter index. Simplest strategy, equally distributes load across all targets. Acts as the default strategy when none is specified.

### `consistent-hash.ts` — `consistentHashStrategy<X>(req, urls): [X, string]`

Selects a target URL based on a hash of the request's consistent-routing header. Priority order: `x-source-id` > `x-forwarded-for` > remote address. Ensures the same client is routed to the same backend, using a simple 32-bit hash function.

## Integration Points

- Both strategies are exported from `src/index.ts` and available as named exports from the package.
- `roundRobinStrategy` is the default strategy used when calling `router.forward()` or `createServer().forward()` without an explicit strategy.
- Used by `createForwardController()` in `handlers/forward.ts`.

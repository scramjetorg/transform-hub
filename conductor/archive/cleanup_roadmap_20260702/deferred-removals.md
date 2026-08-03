# Deferred Removal Record

This record closes the cleanup roadmap by naming compatibility surfaces that remain intentionally retained and by listing what a future breaking-change or extraction plan must prove before removing them.

## Retained compatibility surfaces

### Public v1 APIs

Public v1 API routes and client compatibility remain retained. Phase 4 documented the v1/client compatibility boundary instead of deleting it, and later phases did not change that decision.

Removal requires a future breaking-change plan that proves replacement coverage for every still-supported v1 route, updates public documentation, provides migration guidance, and validates downstream clients that still use the v1 route tree or `@scramjet/api-client` compatibility surfaces.

### Legacy sequence APIs: `this.hub` / `this.space`

Legacy sequence APIs such as `this.hub` and `this.space` remain retained for existing sequence compatibility. This track did not quantify downstream usage or introduce a replacement-only sequence API contract.

Removal requires a future migration plan that inventories sequence fixtures, docs, examples, BDD coverage, and external sequence-author usage; provides a replacement API; and validates both old and new behavior through targeted sequence tests before any breaking change.

### Deprecated `@scramjet/types`

The deprecated `@scramjet/types` compatibility package remains retained. New internal boundaries prefer `@scramjet/runtime-types`, `@scramjet/sequence-types`, and `@scramjet/api-types`, but existing imports continue to resolve through the compatibility barrel.

Removal requires a future type-boundary plan that removes or migrates all compatibility imports, updates sequence-author documentation and fixtures, validates generated exposed types, and preserves or replaces any public type names still consumed externally.

### `packages/verser` and `packages/bpmux`

`packages/verser` and `packages/bpmux` remain retained standalone legacy packages. Phase 7 proved they can still build/import/typecheck with explicit dependencies, and Guard 7 continues to prevent active Transform Hub runtime packages from re-importing the legacy transport.

Removal or extraction requires a future package lifecycle plan that decides whether the packages are published, archived, moved to a separate repository, or deleted; provides migration notes for external consumers; and preserves Guard 7 or an equivalent no-reintroduction check for active runtime packages.

## Deferred transport cleanup candidates

### v1 Host API RPC fallback / `createForwardController`

The old `createForwardController` path remains because it is still part of the v1 Host API RPC fallback. Phase 8 only removed the unused type-only `ResolverTarget.localForwardPath` field.

Removal requires proof that all v1 RPC forwarding scenarios are covered by the verser2 `forwardRpcRequest()` path, including compatibility behavior for instances that do not expose a CSI `forwardRpcRequest` handler.

### Explicit `sth.default.runner.broker` hard-fail

The legacy runner broker peer id `sth.default.runner.broker` remains warn-only. Defaults now use `auto`, but explicit legacy config may still exist outside the repository.

Hard-failing this value requires migration-policy approval backed by deployment/config inventory or a documented breaking-change window.

### Unsupported verser2 edge cases

The following remain intentionally unsupported or direct-access only: generic CONNECT/upgrade forwarding, informational responses, response trailers, `/platform`, `/inout`, and the ignored sequence-to-space tunnel scenario.

Removing or changing these paths requires dedicated protocol support or explicit compatibility deprecation. They should not be treated as dead code solely because they are not forwarded through current verser2 redirect/tunnel APIs.

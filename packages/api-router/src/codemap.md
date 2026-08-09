# packages/api-router/src/

## Responsibility

Source implementation for `@scramjet/api-router`: framework-neutral route contracts, router composition, manifest collection, validation, OpenAPI generation, generic clients, HTTP/verser2 registration adapters, decorator-based API, and CLI tooling.

## Design / Patterns

- **Contract-first routing**: `manifest.ts` defines Zod-backed `RouteDefinition`, `ResolverDefinition`, request/response inference helpers, manifests, and path utilities. Key types: `RouteSchemas`, `RouteRequest`, `RouteResponse`, `RouteHandler`, `ResolverDefinition`, `RouteManifest`, `RouteManifestEntry`.
- **Builder/facade**: `api.ts` exposes the `Router` facade for declarative route/resolver creation; `router.ts` owns the mutable `RouterDefinition` builder with `route()`, `get()`, `post()`, `mount()`, `resolve()` methods and deterministic manifest collection via `collect()`.
- **Adapter boundary**: `adapters/http.ts` registers routes on Cero-based `APIExpose` surfaces (including resolver middleware for verser2 redirect, `executeRouteDefinition()`, `registerHttpRoutes()`); `adapters/verser2.ts` registers routes on verser2 adapters via `registerVerser2Routes()`.
- **Binding layer**: `bind.ts` maps handlerless contract sets from `TypedRouteSet`/`TypedResolverSet` to exact handler bindings (`bindRoutes`, `bindResolvers`, `bindResolver`) with `routeBinding.skip()`, `routeBinding.contractOnly()`, and override support.
- **Hook pipeline**: `hooks.ts` composes before/after/error/finally hooks (`executeRoutePipeline`) around route execution. Includes `RouteHook`, `RouteHookContext`, `RoutePipeline` types.
- **Decorator API**: `decorators.ts` provides `@Api()`, `@Route()`, `@Get()`, `@Post()` class/method decorators with `collectDecoratedRoutes()`.
- **Client/transport**: `client.ts` defines `ApiClient`, `ApiClientTransport`, `createApiClient()`. `client-transports.ts` provides `createHttpClientTransport()` (fetch-based), `createVerser2ClientTransport()`.
- **Schema/OpenAPI**: `openapi.ts` generates OpenAPI 3.1 documents from manifests with Zod-to-JSON-Schema conversion (`zodToJsonSchema()`, `objectToJsonSchema()`). `schema-mode.ts` loads manifests from schema modules (`loadManifestFromSchemaModule()`).
- **Validation**: `validation.ts` provides `validateRouteRequest()`/`validateRouteResponse()` against Zod schemas, throws `RouteValidationError`.
- **CLI**: `bin/generate.ts` — OpenAPI document generator from schema module files.

## Data & Control Flow

1. API packages declare routes with `Router.get/post/route/resolve()` or decorators.
2. Runtime packages bind handlers through `bindRoutes()`/`bindResolvers()`/`bindResolver()` or mount handlerless routers directly.
3. `RouterDefinition.collect()` emits a `RouteManifest` with duplicate detection; resolver expansion can project nested public paths.
4. `registerHttpRoutes()` or `registerVerser2Routes()` adapts routes for execution on the target surface.
5. HTTP adapter validates requests/responses with `validation.ts`, runs hook pipeline via `executeRoutePipeline()`.
6. Generic clients use manifests through `createApiClient()` + `ApiClientTransport` (HTTP or verser2).
7. OpenAPI generation uses `generateOpenApi(manifest)` → Zod-to-JSON-Schema conversion.

## Integration Points

- Consumed by `@scramjet/rest-api2` for v2 route trees, clients, schema-mode fixtures, and OpenAPI generation.
- Consumed by Host (`host-api-v2.ts`), Manager (`manager-api-v2.ts`), and MultiManager (`multi-manager-api-v2.ts`) for v2 route registration and resolver forwarding.
- Also consumed by v1 compatibility routers for version/config/status/load contracts.
- Depends on `zod` for schema contracts and `@scramjet/types` for API server request/response abstractions.

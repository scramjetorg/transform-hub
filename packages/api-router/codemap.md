# packages/api-router/

## Responsibility

`@scramjet/api-router` owns schema-aware API route declaration contracts, route manifest collection, resolver/route binding, generic client transport contracts, OpenAPI generation, HTTP/verser2 runtime adapters, decoration API, and CLI tooling.

## Design / Patterns

- **Framework-neutral core**: Route definitions are collected into deterministic manifests before being adapted to HTTP or verser2 execution surfaces.
- **Zod-first schemas**: Request and response contracts are represented with Zod schemas and inferred TypeScript types where practical.
- **Shared manifest boundary**: The same route metadata drives execution adapters, OpenAPI generation, and generic client construction.
- **Builder/facade**: `Router` facade (in `api.ts`) and `RouterDefinition` class (in `router.ts`) provide declarative route/resolver creation with mount support and deterministic manifest collection.
- **Binding layer**: `bindRoutes()`/`bindResolvers()` map handlerless contract sets to exact handler bindings with skip/contract-only support.
- **Adapter boundary**: `adapters/http.ts` and `adapters/verser2.ts` translate manifests into Cero-style HTTP handlers or verser2 route registrations.
- **Decorator API**: `@Api`/`@Route`/`@Get`/`@Post` decorators for class-based route definitions.
- **Hook pipeline**: Before/after/error/finally hooks composed around route execution via `executeRoutePipeline()`.
- **Validation layer**: `validateRouteRequest()`/`validateRouteResponse()` for runtime request/response validation against Zod schemas.
- **Generic client transports**: `createHttpClientTransport()` (fetch-based) and `createVerser2ClientTransport()` for typed API client generation.
- **OpenAPI generation**: `generateOpenApi()` produces OpenAPI 3.1 documents from manifests with Zod-to-JSON-Schema conversion.
- **CLI generation**: `bin/generate.ts` loads manifests from schema modules and writes OpenAPI JSON documents.

## Integration Points

- Reuses `@scramjet/types` API abstractions and utility types.
- Uses `zod` as the primary schema source.
- Consumed by `@scramjet/rest-api2` for v2 route trees, clients, schema-mode fixtures, and OpenAPI generation.
- Consumed by Host, Manager, and MultiManager API handlers for v1/v2 route registration and resolver forwarding.
- Route manifests power fluent clients (`client.ts`) over HTTP (`createHttpClientTransport`) or verser2 (`createVerser2ClientTransport`).
- OpenAPI generation (`openapi.ts`) with Zod-to-JSON-Schema conversion used by the CLI generator.

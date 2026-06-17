# Specification: API Revamp

## Overview

Create a new TypeScript workspace package, `@scramjet/api-router`, that provides a documented, schema-aware API routing layer for Scramjet Transform Hub. The router must support both decorator-based and non-decorator route declaration, use Zod as the primary validation/schema source, expose OpenAPI 3.1 contracts, and provide route pipeline hooks for cross-cutting behavior such as CORS, headers, authentication, and authorization.

The new router will be introduced as a v2 API surface while preserving exact backwards compatibility for all existing v1 Hub, Manager, MultiManager, and CSI/Instance APIs. v2 APIs must be available through both normal HTTP serving and verser2 broker routing. The implementation plan should cover the full API migration, phased sensibly: first router/middleware foundations, then route sections, then v1 compatibility wrapping.

The design should use the `@drumwave-integration/router` package in the sibling `drumwave-integration` repository as a reference for lightweight decorator metadata, imperative registration, route collection, and typed request/client patterns, while adapting it to Scramjet requirements for Zod-first validation, OpenAPI 3.1 generation, hooks, verser2 integration, and exact v1 compatibility.

## Goals

- Provide a readable, typed, documented route declaration model for Scramjet APIs.
- Reduce the difficulty of understanding and maintaining current Hub and Manager API implementations.
- Centralize validation, schema exposure, route metadata, and hook composition.
- Enable generated OpenAPI 3.1 documentation from implemented route definitions.
- Support future generic API client construction from generated schemas, while keeping the generic API client itself as a separate module/package.
- Add v2 API exposure without breaking existing v1 clients.
- Plan a migration path where v1 is eventually backed by/wrapped around the v2 route implementation while preserving exact v1 behavior.

## Functional Requirements

### Router Package

- Add a new workspace package named `@scramjet/api-router`.
- The package must support strict TypeScript, CommonJS build output, declaration generation, and the repository's npm workspace conventions.
- The package must expose route declaration APIs for:
  - class-level router decorators;
  - method-level route decorators for common HTTP methods;
  - non-decorator/imperative route definitions equivalent in capability to decorators;
  - mounting routers/classes under a base path;
  - collecting route definitions and registering them into HTTP and verser2 execution surfaces.
- The package should follow lightweight metadata collection patterns inspired by `@drumwave-integration/router`, but must not assume Drumwave's lack of runtime schema support.

### Zod-First Schema and Validation

- Route definitions must use Zod schemas as the primary source for request/response validation and schema metadata.
- The router must support schemas for path params, query, headers where applicable, request body/payload, and responses.
- Runtime validation failures must produce consistent, actionable errors.
- Types should be inferred from Zod schemas where practical, so route handlers remain strongly typed.
- Existing ad-hoc validation behavior should be inventoried and replaced or wrapped only when the resulting public behavior remains compatible for v1.

### OpenAPI 3.1 Generation

- Provide a CLI entrypoint for schema generation, e.g. `npx @scramjet/router generate path/to/some-api.ts` or the final package-equivalent command.
- The generator must execute or load API definition files in a safe "schema mode" that exports schemas/route metadata without starting servers or side effects.
- The first schema output format must be OpenAPI 3.1.
- Generated OpenAPI must include route paths, methods, descriptions, request schemas, response schemas, and relevant hook/security metadata where available.
- The design should leave room for an internal route/schema manifest if needed by a future generic API client package.

### Hook Pipeline

- Implement route pipeline hooks with typed context.
- Hooks must be composable at router/class and route levels where practical.
- Initial hook use cases must include CORS, headers, authentication, authorization, request preprocessing, response postprocessing, and error handling.
- Existing middleware behavior such as CORS/options handling, safe handler wrapping, request logging, and forwarding must be preserved during migration.

### Decorator and Imperative Usage

- Decorator usage should allow classes to define specific route methods with descriptions, typings, schemas, validation, and hooks.
- Imperative usage must offer equivalent capability, for example:

```ts
Router.api(class APIRoute1 {
  health = Router.get("/api/health", () => reportHealth(), {
    description: "Health endpoint",
    validate() {
      return true;
    }
  });
});
```

- The exact final API may differ if needed for TypeScript correctness, but decorator and non-decorator capabilities must remain equivalent.

### v2 Exposure and verser2

- Add a v2 API surface powered by the new router.
- v2 must be available over normal HTTP and over verser2 broker routing.
- v2 route registration should support Hub, Manager, MultiManager, and CSI/Instance API sections.
- Route definitions should be reusable across HTTP and verser2 execution where possible.

### Existing API Migration

- Preserve exact v1 behavior while adding v2, including paths, response shapes, status codes, stream behavior, headers, and client-visible errors unless a later explicit decision exempts a case.
- The implementation plan must cover migration of all exposed API areas, phased sensibly:
  - middleware/hook foundations first;
  - low-risk health/version/status/config endpoints;
  - sequence operations;
  - instance/CSI streams, control, events, health, and RPC;
  - Manager and MultiManager routes, including forwarding and storage proxy behavior;
  - final v1 wrapper compatibility work.
- Backwards compatibility should be proven with focused tests and existing BDD/API smoke coverage where needed.

### API Client Schema Support

- Route/schema output must be suitable for future generic API client construction.
- The generic API client implementation is out of this package/track unless explicitly added later, but schema generation should not block it.

## Non-Functional Requirements

- Maintainability: route definitions should make API structure easier to read than the current scattered `api-server` route registration code.
- Type safety: route handlers and schemas should minimize duplicated DTO typing.
- Compatibility: v1 behavior must remain exact during and after v2 introduction.
- Incrementality: migration must be phased and reviewable, avoiding a single broad rewrite.
- Operational reliability: changes must not disrupt existing sequence execution, adapter behavior, runner communication, or verser2 routing.
- Documentation alignment: generated and hand-written docs must match the implemented API behavior.
- Test-conscious development: add or update package-level tests and escalate to BDD smoke tests only when required by cross-package behavior.

## Acceptance Criteria

- `@scramjet/api-router` exists as a workspace package with build/test wiring consistent with the monorepo.
- The package supports decorator and imperative route declaration with equivalent route metadata, schemas, hooks, and registration behavior.
- Zod schemas validate requests and can infer useful handler types.
- OpenAPI 3.1 generation works from schema-mode route definition files without starting the Hub/Manager.
- Route pipeline hooks can implement CORS, headers, authn/z, request/response processing, and error handling.
- At least one v2 route section is live over HTTP and verser2 using the new router, with the plan covering subsequent route sections.
- Existing v1 API behavior remains exact for migrated areas and is covered by focused regression tests.
- The migration plan identifies affected Hub, Manager, MultiManager, and CSI/Instance routes and validates each phase with narrow commands.
- Generated schema output contains enough route metadata to support a future separate generic API client module.

## Out of Scope

- Replacing the entire existing `packages/api-server` implementation in one step.
- Breaking or simplifying v1 public behavior without explicit approval.
- Implementing the separate generic API client package, except for ensuring generated schemas can support it.
- Migrating unrelated CLI behavior that does not depend on the API route surface.
- Changing runtime wrapper, adapter, or sequence execution protocols except where required for verser2 API exposure and explicitly planned.
- Introducing a non-Zod primary schema system for the initial router design.

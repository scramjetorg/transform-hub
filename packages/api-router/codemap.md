# Package Atlas: api-router

## Responsibility

`@scramjet/api-router` owns schema-aware API route declaration contracts, route manifest collection, and generic client transport contracts for the API revamp track.

## Design / Patterns

- Framework-neutral core: route definitions are collected into deterministic manifests before being adapted to HTTP or verser2 execution surfaces.
- Zod-first schemas: request and response contracts are represented with Zod schemas and inferred TypeScript types where practical.
- Shared manifest boundary: the same route metadata should drive execution adapters, OpenAPI generation, and generic client construction.

## Integration Points

- Reuses `@scramjet/types` API abstractions and utility types where relevant.
- Uses `zod` as the primary schema source.
- Future phases will add adapters for `@scramjet/api-server` and verser2 broker transports.

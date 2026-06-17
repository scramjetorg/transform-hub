# Implementation Plan: API Revamp

## Phase 1: Track Setup, Baseline Inventory, and Review Surface

- [ ] Task: Create dedicated branch and PR review surface for the API revamp track
    - [ ] Confirm current base branch and working tree status
    - [ ] Create a dedicated track branch unless the user explicitly omits branch setup
    - [ ] Prepare PR title/description describing the intended complete v2 API/router state
    - [ ] Create or update the PR when remote permissions and workflow allow
- [ ] Task: Confirm affected packages, entrypoints, and current API behavior
    - [ ] Read package codemaps for `packages/api-server`, `packages/host`, `packages/manager`, `packages/multi-manager`, and affected client/test packages
    - [ ] Inventory current route registrations, middleware, stream handlers, forwarding, and verser2 bridge points
    - [ ] Record exact v1 compatibility constraints for paths, response bodies, status codes, stream behavior, headers, and errors
- [ ] Task: Review shared packages and reusable contracts before adding new code
    - [ ] Check `@scramjet/types`, `@scramjet/symbols`, `@scramjet/config`, `@scramjet/adapters-common`, and existing `packages/api-server` exports for reusable types or helpers
    - [ ] Decide which existing DTOs and API contracts should be reused by router schemas
    - [ ] Record any intentional non-use of shared code and why
- [ ] Task: Establish automated regression baseline
    - [ ] Identify exact package test files covering `packages/api-server`, Host, Manager, MultiManager, CSI/Instance, and verser2 behavior
    - [ ] Run or dry-select the narrow existing test commands that prove current baseline behavior before changes
    - [ ] Capture baseline command names and any preexisting failures in `plan.md`
    - [ ] Identify which BDD smoke tests are automated gates for later phases and which are manual/escalation-only
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Track Setup, Baseline Inventory, and Review Surface' (Protocol in workflow.md)

## Phase 2: `@scramjet/api-router` Package Foundation

- [ ] Task: Add the new workspace package skeleton
    - [ ] Create `packages/api-router` with npm workspace metadata, TypeScript configs, build/test scripts, and public exports
    - [ ] Wire package references and workspace dependencies consistently with existing packages
    - [ ] Add package codemap/README stubs if required by repository conventions
- [ ] Task: Define the router core model
    - [ ] Add route definition types for HTTP method, path, description, schemas, hooks, handler, response metadata, and mount/base path
    - [ ] Define typed request/response context using Zod-inferred params, query, headers, body, and response types
    - [ ] Add duplicate route detection, path normalization, and deterministic route collection
- [ ] Task: Implement decorator and imperative route declaration
    - [ ] Add class-level router decorator support and method decorators for common HTTP methods
    - [ ] Add `Router.api(...)` or final equivalent API for class/object-based route definitions
    - [ ] Add imperative helpers matching decorator capabilities
    - [ ] Add tests proving decorator and imperative definitions produce equivalent route metadata
- [ ] Task: Implement Zod-first validation primitives
    - [ ] Add schema definitions for params, query, headers, body/payload, and responses
    - [ ] Validate incoming requests and normalize validation errors
    - [ ] Validate or serialize outgoing responses where configured
    - [ ] Add focused tests for validation success/failure and inferred handler types
- [ ] Task: Automated verification gate for package foundation
    - [ ] Run the new `@scramjet/api-router` unit tests through the package's npm script
    - [ ] Run package typecheck/build for `@scramjet/api-router`
    - [ ] Run changed-package lint or repository lint if required by touched files
    - [ ] Add the verification commands and results to `plan.md`
- [ ] Task: Conductor - User Manual Verification 'Phase 2: `@scramjet/api-router` Package Foundation' (Protocol in workflow.md)

## Phase 3: Hook Pipeline, HTTP Adapter, and verser2 Adapter

- [ ] Task: Implement route pipeline hooks
    - [ ] Define typed hook context and lifecycle stages for before, after, error, and finalization behavior
    - [ ] Support router/class-level and route-level hook composition
    - [ ] Add built-in or example hooks for CORS, headers, authentication, authorization, request preprocessing, response postprocessing, and error handling
    - [ ] Add tests for hook order, short-circuit behavior, errors, and typed context propagation
- [ ] Task: Implement adapter to existing HTTP API server behavior
    - [ ] Register collected routes into the existing `packages/api-server`/0http execution surface without breaking existing exports
    - [ ] Preserve safe handler behavior, OPTIONS/CORS handling, request logging, body parsing expectations, and stream compatibility where applicable
    - [ ] Add tests for HTTP route execution through the adapter
- [ ] Task: Implement verser2 execution adapter for v2 routes
    - [ ] Integrate route definitions with existing verser2 forwarding/broker abstractions where appropriate
    - [ ] Preserve route readiness, abort signal, domain routing, and response streaming semantics
    - [ ] Add tests around routed request execution or adapter contract boundaries
- [ ] Task: Automated verification gate for hook/adapters
    - [ ] Run `@scramjet/api-router` tests including hook and adapter suites
    - [ ] Run affected `packages/api-server` tests, including `routed-forward` tests when applicable
    - [ ] Run package build covering `api-router` and `api-server`
    - [ ] Run changed-file lint for hook/adapter files
    - [ ] Record verification output and any classified failures in `plan.md`
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Hook Pipeline, HTTP Adapter, and verser2 Adapter' (Protocol in workflow.md)

## Phase 4: OpenAPI 3.1 Generation and Schema Mode

- [ ] Task: Implement schema/export manifest model
    - [ ] Define internal route manifest structure suitable for OpenAPI generation and future generic client construction
    - [ ] Include descriptions, paths, methods, params, query, headers, request bodies, responses, hook/security metadata, and tags/groups
    - [ ] Ensure manifest generation does not require starting Hub, Manager, or servers
- [ ] Task: Add OpenAPI 3.1 generation
    - [ ] Convert Zod route schemas to OpenAPI 3.1-compatible JSON Schema
    - [ ] Generate paths, operations, parameters, request bodies, responses, and security/hook metadata
    - [ ] Add tests for generated OpenAPI structure and representative schema types
- [ ] Task: Add CLI schema generation command
    - [ ] Provide a bin command for `generate path/to/api-definition.ts` under the final package command name
    - [ ] Implement safe schema-mode loading/execution contract for API definition files
    - [ ] Support output to stdout and/or file as defined by the package API
    - [ ] Add tests for CLI generation on a fixture API definition
- [ ] Task: Automated verification gate for OpenAPI generation
    - [ ] Run `@scramjet/api-router` generator/unit tests
    - [ ] Run the CLI generator against a checked-in fixture and assert the output validates as OpenAPI 3.1 JSON
    - [ ] Run package build and verify the bin entrypoint exists in build output
    - [ ] Store or compare a deterministic generated fixture snapshot where appropriate
    - [ ] Record verification output in `plan.md`
- [ ] Task: Conductor - User Manual Verification 'Phase 4: OpenAPI 3.1 Generation and Schema Mode' (Protocol in workflow.md)

## Phase 5: v2 Middleware and Low-Risk Route Exposure

- [ ] Task: Create v2 API integration points
    - [ ] Add v2 registration locations for Host, Manager, MultiManager, and CSI/Instance without changing v1 route registration
    - [ ] Configure v2 availability over normal HTTP and verser2 broker routing
    - [ ] Keep v1 `/api/v1` behavior untouched
- [ ] Task: Migrate middleware behavior into v2 hooks first
    - [ ] Implement CORS/options behavior through the hook pipeline
    - [ ] Implement headers and request logging behavior through hooks where appropriate
    - [ ] Preserve existing error mapping and safe handler behavior for v1 compatibility
    - [ ] Add tests proving middleware parity for representative requests
- [ ] Task: Add low-risk v2 route sections
    - [ ] Define v2 health/status/version/load-check/config route schemas and handlers for Host where applicable
    - [ ] Define v2 version/info/health/load-check/trust route schemas and handlers for Manager/MultiManager where applicable
    - [ ] Expose the same v2 route definitions over HTTP and verser2
    - [ ] Add focused tests for v2 route output and v1 unchanged behavior
- [ ] Task: Automated verification gate for first v2 exposure
    - [ ] Run `api-router`, `api-server`, Host, Manager, and MultiManager package tests affected by v2 registration
    - [ ] Add automated assertions that representative `/api/v1` endpoints are unchanged while matching v2 endpoints respond correctly
    - [ ] Run verser2 transport/routed-forward tests proving v2 routes can be reached over broker routing
    - [ ] Run the narrow API BDD smoke test only if unit/package tests cannot prove cross-package HTTP/verser2 behavior
    - [ ] Record v1 compatibility evidence in `plan.md`
- [ ] Task: Conductor - User Manual Verification 'Phase 5: v2 Middleware and Low-Risk Route Exposure' (Protocol in workflow.md)

## Phase 6: Sequence and Instance/CSI Route Migration to v2

- [ ] Task: Migrate sequence route definitions to v2
    - [ ] Define schemas and route handlers for sequence upload, update, delete, start, get, list, and related entity routes
    - [ ] Preserve existing DTO and `OpResponse` expectations for v1 while defining v2 contracts intentionally
    - [ ] Add focused tests for validation, response shape, and failure behavior
- [ ] Task: Migrate Instance/CSI routes to v2
    - [ ] Define schemas and handlers for instance health, input/output, stdin/stdout/stderr/log, monitoring, events, set, stop, kill, and RPC routes
    - [ ] Preserve streaming behavior, duplex/upstream/downstream semantics, and current route aliases where required
    - [ ] Add tests for stream route registration and representative control/event behavior
- [ ] Task: Automated verification gate for sequence and CSI behavior
    - [ ] Run affected Host, CSI/Instance, `api-server`, and `api-router` tests
    - [ ] Add automated v1/v2 parity assertions for representative sequence control and read routes
    - [ ] Add automated stream/duplex route tests for representative CSI routes where feasible without full runtime startup
    - [ ] Run `npm run test:bdd-ci-api-node` or a narrower equivalent when package tests cannot prove end-to-end host API behavior
    - [ ] Record skipped Docker/Kubernetes validation and reason
- [ ] Task: Conductor - User Manual Verification 'Phase 6: Sequence and Instance/CSI Route Migration to v2' (Protocol in workflow.md)

## Phase 7: Manager, MultiManager, Forwarding, and Storage Route Migration to v2

- [ ] Task: Migrate Manager route definitions to v2
    - [ ] Define schemas and handlers for STH info, list, instances, sequences, entities, topics, load, disconnect, and STH lifecycle routes
    - [ ] Preserve route classifier behavior and existing forwarding decisions
    - [ ] Add tests for query validation, route classification, and response compatibility where applicable
- [ ] Task: Migrate MultiManager route definitions to v2
    - [ ] Define schemas and handlers for version, info, load-check, list, health, trust, start, stop, logs, audit, and CPM proxy routes
    - [ ] Preserve sub-manager proxying behavior and verser2 guest attachment expectations
    - [ ] Add focused MultiManager tests or fixtures as needed
- [ ] Task: Migrate forwarding and storage proxy behavior to v2
    - [ ] Define v2 route handling for routed forwarding through verser2 transport
    - [ ] Integrate Disk/S3 storage proxy route definitions or adapters where in scope
    - [ ] Preserve streaming, redirect, follow, and unsupported bidirectional behavior
- [ ] Task: Automated verification gate for Manager/MultiManager migration
    - [ ] Run affected Manager, MultiManager, `api-server`, and `api-router` tests
    - [ ] Run route-classifier, verser2-transport, and routed-forward tests explicitly
    - [ ] Add automated v1/v2 parity assertions for representative Manager and MultiManager routes
    - [ ] Run manager/multimanager BDD smoke only when package tests cannot prove integration behavior
    - [ ] Record v1 compatibility evidence and deduplication results in `plan.md`
- [ ] Task: Conductor - User Manual Verification 'Phase 7: Manager, MultiManager, Forwarding, and Storage Route Migration to v2' (Protocol in workflow.md)

## Phase 8: v1 Wrapper Compatibility, Documentation, and Final Validation

- [ ] Task: Implement v1 wrapper/backing strategy after v2 coverage is available
    - [ ] Route v1 handlers through v2 implementations or compatibility adapters only where exact v1 behavior is preserved
    - [ ] Keep path aliases, response shapes, status codes, headers, and error payloads exact
    - [ ] Add compatibility tests for migrated v1 wrappers versus current expectations
- [ ] Task: Update documentation and examples
    - [ ] Document decorator and imperative router usage
    - [ ] Document Zod schema patterns, hook pipeline, OpenAPI generation, schema mode, HTTP registration, and verser2 registration
    - [ ] Include migration notes for v1 compatibility and v2 route sections
- [ ] Task: Run final deduplication and shared package review
    - [ ] Move repeated route/schema/hook helpers into shared package exports where safe
    - [ ] Confirm no duplicate DTOs, constants, validation helpers, or route metadata types were introduced unnecessarily
    - [ ] Record intentionally deferred deduplication with reasons
- [ ] Task: Automated final verification gate
    - [ ] Run `npm run build:packages` or the narrowest equivalent covering all changed packages
    - [ ] Run relevant serial package tests, escalating to `npm run test:packages-no-concurrent` if changed surface spans many packages
    - [ ] Run `npm run lint` or changed-file lint where appropriate
    - [ ] Run `npm run test:bdd-ci-api-node` and any Manager/MultiManager/verser2 smoke commands required by changed integration scope
    - [ ] Regenerate OpenAPI output and verify deterministic output for documented example routes
    - [ ] Record all validation results, skipped checks, known failures, and reasons in `plan.md`
- [ ] Task: Conductor - User Manual Verification 'Phase 8: v1 Wrapper Compatibility, Documentation, and Final Validation' (Protocol in workflow.md)

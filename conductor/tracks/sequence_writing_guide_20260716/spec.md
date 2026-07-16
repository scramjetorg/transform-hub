# Sequence Writing Guide

## Overview

Create a complete sequence-authoring guide that pairs each conceptual (“dry”)
page with a relaxed, case-led (“wet”) walkthrough. The track closes the platform
and test gaps required to make the guides accurate, while keeping wet examples as
documentation code rather than separately maintained example packages.

The guide targets authors who run sequences near local data or services and need
clear boundaries for lifecycle, control, HTTP API exposure, MCP bridging,
sequence communication, topics, state, and testing.

The complete guide, wet-example, capability, and synthetic-test inventory is
maintained in [Guide Map](./guide-map.md). It is part of this specification and
must remain current as the implementation plan is refined.

## Functional Requirements

### Documentation structure

- Deliver all eight dry/wet guide pairs:
  1. lifecycle and a local validation service;
  2. control and a customer-site health service;
  3. sequence HTTP API exposure and a trusted MCP bridge;
  4. communication-path selection and local object-data filtering;
  5. topics and a customer-site probe pipeline;
  6. sequence testing and an incremental aggregator with a file-backed mock cursor;
  7. `SequenceAppContext` and runtime parity;
  8. configuration/resources/state and source-side data summarization.
- Write editable sources under `docs-source/`; regenerate corresponding `docs/`
  output through the repository documentation workflow.
- Each wet page must identify its motivating public case, explain the practical
  problem in a more relaxed author-facing tone, and provide concise executable
  solution code without claiming to reproduce the original environment.
- Each wet page must link to one primary dry page and state prerequisites,
  adapter/runtime limits, trust boundaries, and the smallest appropriate
  validation command.

### Lifecycle, state, and testing

- Define a lifecycle initialization contract in which a sequence validates
  packaged or otherwise locally available resources before registering/serving
  its API and before entering a long-running stream or promise.
- The exposed API listener is deferred until validation succeeds. Validation
  failure emits structured diagnostics, leaves no listener active, terminates the
  instance as errored, and requires a fresh instance start rather than an
  in-process retry contract.
- Define observable validation failure behavior: structured logs and events,
  errored instance outcome, and no active service phase.
- Document configuration, packaged resources, configured external sources, and
  a fixture- and documentation-only file-backed mock cursor store. Do not present runtime-managed
  checkpointing or `this.save()` as the persistence mechanism.
- Extend synthetic `@scramjet/sequence-test` fixtures to cover progression only:
  initialization, validation failure, readiness, health changes, topic routing,
  events, API responses, cursor-store interactions, and shutdown. Do not make
  full wet examples the fixture-test subject.

### Runtime, control, and routing capability fixes

- Implement a shared additional-health schema and merge behavior across Node,
  Bun, and Python; preserve it through monitoring frames, Hub and Manager APIs,
  and CLI-visible results.
- The canonical health payload retains `healthy: boolean` and carries
  author-provided data in a bounded `details: object`. Reserved runtime fields
  cannot be replaced; handler output is validated, malformed output produces a
  classified sequence diagnostic, and multiple handlers merge only namespaced
  detail entries deterministically. Phase 2 selects and tests the concrete
  details-size bound and namespace-key grammar before implementation begins.
- Define and implement a tested readiness contract for exposed sequence routes.
- Provide a documented file-loaded/autostarted sequence configuration suitable
  for a Docker Compose documentation stack, including startup order, failure
  reporting, stable instance identification, and secret boundaries.
- Implement and document Hub/Space topic operations for sequence, API, and CLI
  use, including scope, naming/origin, content type, backpressure, connection
  loss, and explicit non-persistence/non-replay semantics.
- Prove equivalent control behavior through direct Hub and Manager-routed paths:
  detailed health, stop, kill, timeout, error, and lifecycle observability.
- Establish multi-runtime AppContext conformance coverage using actual runtime
  integration tests where the sequence-test harness cannot execute a runtime.
- The parity surface is health, lifecycle handlers, structured logs, events,
  Hub/Space clients, and exposed API behavior. Any intentional runtime
  difference must be represented explicitly in the guide and conformance matrix.

### API and communication boundaries

- Document sequence HTTP API exposure separately from an external MCP server.
  The wet walkthrough uses the Node MCP SDK and a file-backed mock cursor store;
  no additional backing service is required. The MCP bridge is reached through private networking
  or an independently configured tunnel URL; STH does not own MCP
  authentication, authorization, public ingress, or tunnel lifecycle.
- Document streams, topics, events, and Hub/Space API calls as distinct
  communication choices. Events are transient notifications and are not proof of
  durable delivery; topics do not imply persistence or replay.
- Document explicit per-example payload guidance rather than introducing a new
  platform-wide enforcement limit. Large data must be streamed, paged, or
  returned as a configured artifact/reference.

## Resolved Delivery Decisions

- Documentation-owned code remains inline in Markdown. Each snippet is assigned
  either a TypeScript/Python compilation check, a focused extracted-snippet test,
  or a documented manual prerequisite; multi-file executable assets are not
  created for the wet walkthroughs.
- The MCP walkthrough may show a Compose topology, but its YAML and
  sequence/MCP/file-store snippets remain inline and are smoke-tested only as the
  smallest selected composition necessary to prove autostart and readiness.
- The file-backed cursor mock is a fixture- and documentation-only local
  temporary file, not a Compose service or production storage prescription.
  Guides must state its local-path, cleanup, durability/failure, and
  non-transactional cursor limitations and direct production users to choose an
  application-owned store separately.
- Phase 2 starts by specifying the Hub/Space topic contract through synthetic
  contract tests: operation shapes, Hub/Space identifiers, naming/origin,
  duplicate-name behavior, content-type propagation, disconnect errors,
  reconnect behavior, routing, and compatibility. The resulting contract is
  recorded before client, API, CLI, Hub, or Manager implementation begins.
- Direct-Hub and Manager-routed control conformance compares the same operation
  set: retrieve boolean health plus `details`, request graceful stop with its
  timeout, request kill, receive classified errors, and observe the terminal
  lifecycle status. Manager routing may add transport metadata but must preserve
  operation meaning and the sequence-visible result.

## Test-Driven Delivery Requirements

- Every phase starts by adding or updating focused tests before implementation
  and documentation work for that phase.
- Fixture tests use synthetic progression and focused fakes/captures only.
- Add targeted package, runtime, API/client, CLI, Manager-routing, and Compose
  integration tests only where a changed contract needs end-to-end evidence.
- Use supported AVA and BDD runners under repository memory safeguards. Record
  memory-guard applicability, thresholds, skips, and exceptions in phase notes.

## Acceptance Criteria

- All eight dry and wet guide pairs are present, linked, generated, and aligned
  with verified behavior.
- Documentation examples compile or execute as documented within their stated
  prerequisites; no standalone full-example reproduction suite is required.
- Synthetic fixtures demonstrate the documented state progressions independently
  of the wet walkthroughs.
- Detailed health, readiness, Hub/Manager control routing, Hub/Space topics,
  autostarted file-loaded sequence setup, and runtime AppContext parity have
  focused passing coverage before their corresponding capability claims publish.
- The Compose/MCP walkthrough distinguishes the sequence API, MCP bridge, and
  tunnel/private-network security surfaces and waits on readiness rather than
  arbitrary sleeps.
- Documentation makes adapter, runtime, store-durability, connectivity,
  authentication, and exactly-once limitations explicit.

## Out of Scope

- Shipping a generic public MCP gateway, owning OpenAI tunnel lifecycle, or
  providing generic remote-shell/tunnel access.
- Reproducing every external incident or providing production-ready deployment
  automation for every wet example.
- Runtime-managed checkpoints, exactly-once guarantees, topic persistence, or
  replay unless separately designed and implemented.
- Replacing data warehouses, distributed SQL engines, VPNs, API gateways, or
  full observability platforms.

## Risks and Constraints

- Cross-runtime behavior, Hub/Manager forwarding, and Hub/Space routing are
  public contract changes and require compatibility-focused tests.
- The file-backed cursor mock must have documented local-path, cleanup,
  durability, and failure semantics; it must not require a network service.
- Generated documentation must not be manually edited.

# Product Guide

## Product Summary

Scramjet Transform Hub is an open-source runtime supervisor for deploying, executing, monitoring, and controlling Transform Sequences across local process, Docker, and Kubernetes environments. It gives application developers, platform engineers, and contributors a consistent way to run long-lived data-processing programs through compatible v1 APIs and a schema-aware v2 API surface while preserving operational visibility and runtime portability.

## Product Vision

Enable teams to run stream-oriented applications reliably anywhere—from local machines to containerized and orchestrated infrastructure—through a simple hub, CLI/API surface, and runtime wrapper protocol.

## Primary Audiences

### App Developers
- Write Transform Sequences in supported runtimes such as Node.js and Python.
- Package and deploy workloads without managing all runtime supervision details directly.
- Use CLI/API workflows to start, stop, provide input, observe output, inspect schema-backed v2 contracts, and respond to lifecycle events.

### Contributors
- Extend package internals, adapters, runners, and runtime wrappers.
- Preserve compatibility across the monorepo while improving implementation quality.
- Add new runtime support using the established runner protocol and parity expectations.

### Platform Engineers
- Operate the hub in local, Docker, or Kubernetes environments.
- Configure adapters, images, and runtime behavior predictably.
- Monitor workloads and maintain reliable execution infrastructure.

## Core Product Outcomes

### Reliable Execution
The hub should consistently supervise sequence deployment, startup, runtime lifecycle, monitoring, API routing, and graceful shutdown across supported adapters.

### Runtime Expansion
The product should maintain parity for existing Node.js and Python runtimes while supporting the addition of new wrappers, including Bun and future languages, without fragmenting the protocol.

### Operational Clarity
Configuration, CLI/API behavior, v2 route contracts, adapter selection, runner image selection, and lifecycle expectations should be understandable, documented, typed, validated, and predictable.

## Product Pillars

### Deploy and Run
- Package and store Transform Sequences.
- Start, stop, and manage running instances.
- Support execution through process, Docker, and Kubernetes adapters.
- Keep runtime-specific launch behavior behind consistent hub abstractions.
- Keep configuration and CLI option handling behind Scramjet-owned descriptors so adapters and commands remain extensible without leaking parser implementation details.

### Observe and Control
- Surface logs, lifecycle events, health state, and monitoring data.
- Support app context communication patterns for events, health, and control flows.
- Expose schema-aware v2 API routes, client contracts, and OpenAPI documentation while preserving exact v1 compatibility.
- Make sequence behavior debuggable for developers and operators.

## Current Product Framing

The near-term product framing is to stabilize Scramjet Transform Hub as a reliable open-source runtime supervisor. Changes should favor correctness, maintainability, clear operational behavior, and compatibility across packages and adapters.

## Success Criteria

- Developers can deploy and run sequences with minimal ambiguity.
- Operators can understand and configure execution environments confidently.
- Contributors can trace behavior through package boundaries and make changes safely.
- Runtime wrapper implementations remain protocol-compatible and testable.
- Documentation and code structure reinforce the same product model.
- API contracts remain discoverable through shared schemas, generated OpenAPI output, and compatibility tests.

## Non-Goals

- Replacing full cloud orchestration platforms.
- Hiding all infrastructure concerns from platform operators.
- Introducing runtime-specific behavior that bypasses the shared runner protocol without clear justification.
- Prioritizing new features over stability when they risk breaking existing adapters or runtime wrappers.

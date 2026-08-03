---
id: transform-hub-core-concepts
slug: /transform-hub/core-concepts
title: Core concepts
---

# Core concepts

This page defines the key concepts behind Scramjet Transform Hub. Understanding these terms will help you navigate the rest of the documentation.

## Hub (STH)

The **Hub** — also called the Scramjet Transform Hub (STH) process — is the core runtime that runs on each host. It accepts deployed Sequences, launches and manages their execution, handles data flow between Sequences, and reports health and status back to the Manager. Each Hub operates independently but can be centrally managed.

## Manager

The **Manager** is the central orchestration service that provides a unified API for interacting with a fleet of Hubs. It routes commands — deploy, stop, inspect, and monitor — to the appropriate Hub and aggregates responses. Operators interact with the Manager through the [CLI](../cli/usage.md) or [API client](../api/client-usage.md) rather than addressing individual Hubs directly.

See the [Manager documentation](../manager/overview.md) for details.

## MultiManager

**MultiManager** coordinates multiple Manager processes, their API surface, and sub-Manager lifecycle. It is not documented here as an HA, failover, load-balancing, persistence, or automatic Hub-redirection mechanism.

## Sequence

A **Sequence** is a data processing program — written in JavaScript (Node.js), TypeScript, Bun, or Python — that receives input, processes it, and produces output. Sequences are packaged in a Scramjet-specific format (a `.tar.gz` archive containing the code, manifest, and dependencies) and deployed to a Hub. Sequences are the fundamental unit of computation in Transform Hub.

## Instance

An **Instance** is a running execution of a Sequence on a Hub. When a Sequence is deployed, the Hub creates an Instance, assigns it an ID, and tracks its lifecycle state: starting, running, stopping, stopped, or errored. Each Instance is isolated and can be inspected or controlled independently.

## Adapter

An **Adapter** is the Hub component that interfaces with the host environment to spawn and manage Runners. Transform Hub ships with three adapters:

- [**Process Adapter**](../deployment/process-adapter.md) — runs Sequences as child processes on the host OS. Suitable for development, testing, and bare-metal or VM deployments.
- [**Docker Adapter**](../deployment/docker-adapter.md) — runs Sequences in Docker containers. Provides container-level isolation and resource limits.
- [**Kubernetes Adapter**](../deployment/kubernetes-adapter.md) — runs Sequences as Kubernetes pods. Integrates with existing K8s infrastructure for scaling and scheduling.

## Runner

A **Runner** is the child process (or container) that executes a Sequence's code. The Hub spawns Runners through the configured Adapter. The Runner loads the Sequence package, instantiates the sequence class, and bridges data streams between the Hub and the running program.

## Topics

**Topics** are named data channels used for live service discovery and stream delivery between connected Hub components. The Manager can broker a topic stream between an owning Hub and a remote Hub through its topic multiplexer, but topic data is not persisted or replayable. Topics do not create direct Sequence-to-Sequence network connections.

## Streams

**Streams** are the core data-flow abstraction in Transform Hub. Sequences operate on streams of data — each Sequence receives an input stream and can produce one or more output streams. The Hub manages transient stream backpressure and delivery; it is not a persistence or replay layer.

## APIs

Transform Hub exposes HTTP APIs at both the Hub and Manager level:

- **Hub API** — direct control of a single Hub: deploy Sequences, inspect Instances, manage Topics. Used by the Manager internally and by advanced users for direct Hub access.
- **Manager API** — unified control plane for a fleet of Hubs. The primary interface for operators.
- **API Client** — schema-aware v2 client helpers live in `@scramjet/rest-api2`; the legacy `@scramjet/api-client` package remains supported for v1/backwards-compatible integrations. See the [API client documentation](../api/client-usage.md) for current usage.

The newer `@scramjet/rest-api2` package provides schema-generated type definitions and client helpers for the evolving API surface. Its route tree powers the v2 runtime routers and client implementations. The package is labeled experimental in the curated reference.

## Next steps

- [Get started](getting-started.md) with your first Sequence.
- Read the [Manager overview](../manager/overview.md) to understand orchestration.
- See [deployment options](../deployment/process-adapter.md) for different runtime environments.

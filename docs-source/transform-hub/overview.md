---
id: transform-hub-overview
slug: /transform-hub/overview
title: Transform Hub overview
---

# Transform Hub overview

Scramjet Transform Hub is a data processing platform designed for running stream-processing programs called **Sequences**. It orchestrates the lifecycle of data processing pipelines across a distributed fleet of hosts, from deployment and monitoring to scaling and teardown.

## What Transform Hub is

Transform Hub provides a unified runtime environment for data transformation workloads. You write a Sequence — a program that receives, transforms, and emits data — and Transform Hub handles the rest: deployment, execution, inter-process communication, and health monitoring.

At its core, Transform Hub consists of two primary services:

- **Hub (STH)**: The runtime process that executes Sequences on a host. Each Hub manages its own set of running Sequence Instances and communicates with a central Manager.
- **Manager**: The orchestration layer that coordinates multiple Hubs, providing a single control plane for deploying and managing Sequences across your infrastructure.

## When to use Transform Hub

Transform Hub is well-suited for:

- **Stream processing workloads** — process data as it arrives, without batching or storage intermediaries.
- **Event-driven pipelines** — chain Sequences together through Topics to build multi-stage transformations.
- **Edge-to-cloud data flows** — deploy Sequences on lightweight hosts near data sources, coordinated through a central Manager.
- **Multi-language data transformation** — write Sequences in JavaScript (Node.js) or Python and deploy them side by side.
- **Platform-controlled runners** — let Transform Hub manage process lifecycle, scaling, and health checks while your code focuses on data logic.

Consider Transform Hub when you need a lightweight, programmable data plane rather than a heavyweight stream-processing framework.

## How it works at a glance

A typical Transform Hub workflow follows these steps:

1. You write a Sequence using the [Sequence API](../intro/overview.md) and package it.
2. You deploy the Sequence to a Hub using the [CLI](../cli/usage.md) or [API client](../api/client-usage.md).
3. The Hub launches a Runner to execute the Sequence, using an Adapter appropriate for the host environment ([Process](../deployment/process-adapter.md), [Docker](../deployment/docker-adapter.md), or [Kubernetes](../deployment/kubernetes-adapter.md)).
4. The Sequence processes input data, optionally publishes results to Topics, and emits output.
5. The [Manager](../manager/overview.md) monitors Hub health and provides a unified view of all running Sequences.

## Next steps

- Learn the [core concepts](core-concepts.md) behind Transform Hub.
- Follow the [getting started guide](getting-started.md) to run your first Sequence.
- Read about [Transform Hub configuration](configuration.md) for production deployments.

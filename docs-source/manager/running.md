---
id: manager-running
slug: /manager/running
title: Running the Manager
---

# Running the Manager

This page covers starting and configuring a Manager instance.

## Prerequisites

- **Node.js** 18 or later
- A Hub or fleet of Hubs to manage (see [connecting Hubs](connecting-hubs.md))

## Install and start

The Manager is available as the `@scramjet/manager` package. It is typically started programmatically or as part of a larger deployment. The source entrypoint is `packages/manager/src/bin/start.ts`:

```bash
npx ts-node ./node_modules/@scramjet/manager/src/bin/start.ts
```

> **Note**: The Manager entrypoint currently accepts no CLI flags. Configuration is handled programmatically via the `ManagerConfiguration` type. The exact startup method is evolving — refer to the generated reference or package documentation for the latest instructions.

By default the Manager does not start its own HTTP server; it relies on the `@scramjet/multi-manager` package or a host process to provide the API surface.

## Verser2 transport

The Manager uses **verser2** as its transport protocol for Hub-to-Manager connectivity. The topology is:

```
Runner → STH-local verser2 Host → STH → Manager
```

There is no direct Runner-to-Manager connection. The verser2 transport runs within the STH (Hub) process and provides the communication channel to the Manager.

In production, verser2 connectivity requires TLS. mTLS is configurable for additional mutual authentication. The Hub's configuration file and CLI flags support verser2 settings — see the [configuration reference](../transform-hub/configuration.md) for conceptual flag descriptions and available knobs.

## Configuration and schema

The standalone Manager entrypoint is currently a programmatic package entrypoint, not a full CLI configuration surface. It uses defaults from `@scramjet/config` and Manager configuration types from `@scramjet/types`.

File and CLI configuration loading is available through the newer `@scramjet/config` command surfaces and the MultiManager package where implemented. For Hub-side configuration, see the [Transform Hub configuration](../transform-hub/configuration.md) page. For Manager type details, refer to `@scramjet/config` and the generated curated reference for `@scramjet/types`.

## MultiManager

For production deployments with high-availability requirements, use the **MultiManager** package (`@scramjet/multi-manager`), which provides:

- CLI flags for port, host, log level, and configuration file
- API server integration
- Sub-Manager lifecycle management

```bash
npx multi-manager --server-api-port 8200
```

See the MultiManager package documentation for complete CLI options.

## Next steps

- [Connect Hubs](connecting-hubs.md) to the Manager.
- Learn [CLI usage patterns](../cli/usage.md) for managing Sequences through the Manager.
- Review [deployment adapters](../deployment/process-adapter.md) for configuring Hubs.

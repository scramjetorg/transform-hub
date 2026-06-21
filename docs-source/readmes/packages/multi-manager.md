The MultiManager is a cloud-platform orchestration component that manages a fleet of STH Hubs across multiple spaces and environments. It provides a unified control plane for deploying, monitoring, and managing Sequences across distributed infrastructure.

## When to use

Use `@scramjet/multi-manager` when you need to coordinate multiple Hubs across different spaces (organizational or functional groupings). It is the recommended control plane for Scramjet Cloud Platform deployments where topology spans multiple locations or tenants.

For single-Manager deployments or smaller topologies, see [@scramjet/manager](../../docs-source/manager/overview.md).

## Quick start

Install the executable package:

```bash
npm install @scramjet/multi-manager
```

Run the MultiManager executable:

```bash
npx multi-manager --help
```

The package publishes two bin names:

```bash
multi-manager
scramjet-cloud-platform-multi-manager
```

In this repository workspace, run the source entrypoint with:

```bash
npm run start -w @scramjet/multi-manager
```

Use the executable help output as the source of truth for current flags. MultiManager owns server/API startup and sub-Manager lifecycle orchestration for multi-space deployments.

## Stability

This package is part of the Scramjet Cloud Platform. Its API is stable for cloud-platform use cases.

## See also

- [Manager overview](../../docs-source/manager/overview.md) for understanding Hub-to-Manager relationships.
- [Connecting Hubs](../../docs-source/manager/connecting-hubs.md) for topology configuration.
- [Transform Hub overview](../../docs-source/transform-hub/overview.md) for platform architecture.

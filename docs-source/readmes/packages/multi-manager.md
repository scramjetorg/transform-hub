MultiManager is an orchestration component around multiple Manager processes and their managed Hubs. It provides API routing, sub-Manager lifecycle orchestration, and aggregation boundaries for health, audit, and related control-plane data; it does not execute Sequences itself.

## When to use

Use `@scramjet/multi-manager` when a deployment needs to coordinate multiple Manager instances and their Hub groups across spaces or environments.

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

Use the executable help output as the source of truth for current flags. MultiManager owns server/API startup, request routing, and sub-Manager lifecycle orchestration. Its aggregation boundary covers control-plane health, audit, and related Manager data; it is not a Sequence runner or a persistence layer.

MultiManager documentation makes no HA, failover, leader-election, or automatic Hub-redirection claim. Those behaviors must not be inferred from the package name or from running multiple Manager processes.

## Stability

This package is part of the Scramjet Cloud Platform. Its API is stable for cloud-platform use cases.

## See also

- [Manager overview](../../docs-source/manager/overview.md) for understanding Hub-to-Manager relationships.
- [Connecting Hubs](../../docs-source/manager/connecting-hubs.md) for topology configuration.
- [Transform Hub overview](../../docs-source/transform-hub/overview.md) for platform architecture.

Scramjet Transform Hub (STH) is the host-side runtime and CLI entrypoint that starts the Hub API, deploys Sequences, launches and supervises Runners, and reports lifecycle and monitoring state. It is the primary server component of the Transform Hub platform.

## When to use

Install and run `@scramjet/sth` in either standalone mode for a single Hub or in Manager-connected mode for a connected-Hub control plane. The Hub manages Sequence lifecycle, host communication, health monitoring, and adapter-based Runner execution through the process, Docker, or Kubernetes adapters.

For multi-Hub orchestration, connect STH instances to a [Manager](../../docs-source/manager/overview.md) or configure them for a [MultiManager](../../docs-source/readmes/packages/multi-manager.md) deployment. The Manager routes control/API operations; STH remains responsible for execution on its host.

## Quick start

Install globally:

```bash
npm install -g @scramjet/sth
```

Start the Hub (default port 8000 with adapter selection):

```bash
scramjet-transform-hub
```

With the [CLI](../../docs-source/cli/usage.md) installed, deploy a sequence from another terminal:

```bash
si sequence pack /path/to/sequence -o sequence.tar.gz
si sequence deploy sequence.tar.gz
```

## Configuration

STH accepts command-line flags and a configuration file. Common options:

- `--port`, `-P` — API port (default: 8000)
- `--hostname`, `-H` — API bind address (default: 0.0.0.0)
- `--log-level`, `-L` — log level (trace, debug, info, warn, error)
- `--cpm-url`, `-C` — Manager URL for Hub-to-Manager connectivity
- `--runtime-adapter` — runner adapter: `process`, `docker`, or `kubernetes`
- `--config`, `-c` — path to JSON configuration file

Run `scramjet-transform-hub --help` for the full option listing.

## Stability

This package is **stable**. The core Hub runtime contract is part of the public API surface.

## See also

- [Transform Hub overview](../../docs-source/transform-hub/overview.md) for architecture and workflow.
- [Transform Hub configuration](../../docs-source/transform-hub/configuration.md) for detailed configuration reference.
- [Build and run workflows](../../docs-source/transform-hub/build-run.md) for Sequence lifecycle details.
- [Manager overview](../../docs-source/manager/overview.md) for multi-host orchestration.

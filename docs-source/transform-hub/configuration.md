---
id: transform-hub-configuration
slug: /transform-hub/configuration
title: Transform Hub configuration
---

# Transform Hub configuration

The Hub process accepts configuration through command-line flags, environment variables, and a configuration file. This page covers the key settings for running Transform Hub in different environments.

## Command-line flags

Start the Hub with common options:

```bash
sth \
  --port 8000 \
  --hostname ::
```

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | `8000` | Hub API HTTP port |
| `--hostname` | `::` | Bind address (all interfaces) |
| `--runtime-adapter` | `detect` | Adapter type: `detect`, `process`, `docker`, or `kubernetes` |
| `--config` | — | Path to configuration file |

## Environment variables

All command-line flags have corresponding environment variables:

- `SCRAMJET_PORT` — API port
- `SCRAMJET_HOSTNAME` — bind address
- `SCRAMJET_CONFIG_PATH` — path to configuration file

## Configuration file

The Hub reads a JSON or YAML configuration file when started with `--config`. The file top-level keys mirror the flag names:

```json
{
  "port": 8000,
  "hostname": "0.0.0.0",
  "runtimeAdapter": "detect"
}
```

## Adapter configuration

Each [adapter](../deployment/process-adapter.md) has additional configuration options:

- **Process adapter**: `cwd` (working directory), `maxProcesses` (concurrency limit)
- **Docker adapter**: `dockerSocket` (Docker socket path), `networkName`, `defaultImage`
- **Kubernetes adapter**: `kubeConfigPath`, `namespace`, `defaultImage`

Set these under the `adapter` key in the configuration file or pass them as Hub startup options. See the [deployment documentation](../deployment/process-adapter.md) for adapter-specific guidance.

## Logging

Configure log level with the `--log-level` flag or `SCRAMJET_LOG_LEVEL` environment variable. Supported levels: `debug`, `info`, `warn`, `error`. The default is `info`.

## Hub identification

Each Hub should have a unique identity for Manager coordination:

- `--id` — explicit Hub identifier (auto-generated if omitted)
- `--cpm-url` — CPM/Manager URL for automatic registration

When `--cpm-url` is set, the Hub attempts to register with the Manager on startup. This is the recommended way to [connect Hubs to a Manager](../manager/connecting-hubs.md).

## Next steps

- [Build and run workflows](build-run.md) for packaging and deploying Sequences.
- Adapter-specific settings: [Process](../deployment/process-adapter.md) | [Docker](../deployment/docker-adapter.md) | [Kubernetes](../deployment/kubernetes-adapter.md)
- [Manager configuration](../manager/running.md) for the orchestration layer.

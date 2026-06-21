---
id: deployment-process-adapter
slug: /deployment/process-adapter
title: Process Adapter
---

# Process Adapter

The **Process Adapter** is the default runtime adapter for Transform Hub. It runs Sequence Runners as child processes directly on the host operating system. This adapter is suitable for development, testing, and production deployments on bare metal or virtual machines where container isolation is not required.

## How it works

When the Process Adapter receives a deployment request, the Hub:

1. Unpacks the Sequence archive.
2. Installs dependencies (Node.js `npm install` or Python `pip install`).
3. Spawns a child process running the Sequence entry point.
4. Connects the child process's stdin/stdout to the Hub's stream infrastructure.
5. Monitors the child process for health and termination.

## Configuration

Set the adapter at Hub startup:

```bash
sth --runtime-adapter process
```

The Hub defaults to `detect`, which tries the Docker adapter first and falls back to the Process Adapter when Docker is unavailable. Pass `--runtime-adapter process` to select the Process Adapter explicitly.

Additional options:

| Option | Default | Description |
|--------|---------|-------------|
| `cwd` | Hub working directory | Working directory for child processes |
| `maxProcesses` | unlimited | Maximum concurrent child processes |

Configure via the Hub configuration file:

```json
{
  "runtimeAdapter": "process",
  "adapter": {
    "cwd": "/opt/scramjet/sequences",
    "maxProcesses": 50
  }
}
```

## When to use

The Process Adapter is ideal for:

- **Development and testing** — quick iteration without container overhead.
- **Single-tenant hosts** — one Hub per host, dedicated to a single workload.
- **Bare-metal deployments** — maximum performance with minimal abstraction.
- **Integration with existing process supervisors** — Pair with `systemd`, `supervisord`, or similar tools.

## Limitations

- No resource isolation between Runners (CPU, memory limits).
- All Runners share the host's process namespace and filesystem.
- Process lifecycle is tied to the Hub's lifecycle — if the Hub stops, all child processes are terminated.
- No built-in container-level networking isolation.

## Next steps

- [Docker Adapter](docker-adapter.md) for container-based isolation.
- [Kubernetes Adapter](kubernetes-adapter.md) for orchestrated container deployments.
- [Transform Hub configuration](../transform-hub/configuration.md) for general Hub settings.
- [Manager overview](../manager/overview.md) for multi-Hub orchestration.

---
id: deployment-docker-adapter
slug: /deployment/docker-adapter
title: Docker Adapter
---

# Docker Adapter

The **Docker Adapter** runs Sequence Runners inside Docker containers. It provides container-level isolation, resource limits, and a consistent runtime environment across hosts. This adapter is suitable for production deployments where workload separation matters.

## How it works

When the Docker Adapter receives a deployment request, the Hub:

1. Unpacks the Sequence archive.
2. Builds a container image (or reuses a cached image) containing the Sequence code and dependencies.
3. Starts a container from that image with the Hub's configured resource limits.
4. Bridges the container's streams to the Hub's topic and stream infrastructure.
5. Monitors the container for health and exit status.

## Configuration

Select the Docker Adapter at Hub startup:

```bash
sth --runtime-adapter docker
```

Adapter-specific options:

| Option | Default | Description |
|--------|---------|-------------|
| `dockerSocket` | `/var/run/docker.sock` | Docker daemon socket path |
| `networkName` | `bridge` | Docker network for containers |
| `defaultImage` | `node:18` | Base image for Node.js Sequences |
| `memoryLimit` | no limit | Per-container memory limit (e.g., `512m`) |
| `cpuLimit` | no limit | Per-container CPU limit (e.g., `1.5`) |

Configure in the Hub configuration file:

```json
{
  "runtimeAdapter": "docker",
  "adapter": {
    "dockerSocket": "/var/run/docker.sock",
    "networkName": "scramjet-net",
    "defaultImage": "node:20",
    "memoryLimit": "512m",
    "cpuLimit": 1
  }
}
```

## Prerequisites

- Docker Engine installed and running on the host.
- The Hub process must have permission to access the Docker socket (`docker` group membership or socket file permissions).
- Container images must be available for the Sequence language (Node.js or Python base images).

## When to use

The Docker Adapter is ideal for:

- **Multi-tenant hosts** — isolate Sequences from each other on shared infrastructure.
- **Consistent environments** — eliminate "works on my machine" issues by controlling the runtime image.
- **Resource guarantees** — set per-Instance CPU and memory limits.
- **Production deployments** — benefit from Docker's restart policies and health checks.

## Limitations

- Higher per-Instance overhead than the Process Adapter (image pull, container startup).
- Requires Docker daemon access — not suitable for environments without Docker.
- Container images must be managed and kept up to date.

## Next steps

- [Kubernetes Adapter](kubernetes-adapter.md) for orchestrated multi-node deployments.
- [Process Adapter](process-adapter.md) for lightweight, non-containerized deployments.
- [Transform Hub configuration](../transform-hub/configuration.md) for general Hub settings.
- [Manager overview](../manager/overview.md) for multi-Hub orchestration.

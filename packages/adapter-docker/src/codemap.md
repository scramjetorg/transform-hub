# packages/adapter-docker/src/

## Responsibility
Source implementation for Docker-based sequence discovery, runner container orchestration, helper utilities, and Docker networking setup.

## Design
`DockerSequenceAdapter` and `DockerInstanceAdapter` are thin orchestration layers over `IDockerHelper`. Docker-specific concerns are centralized in `dockerode-docker-helper.ts` and `docker-networking.ts`.

## Data & Control Flow
Sequence identification validates prerunner output, decodes package metadata, and maps `engines.python3` to the Python runner image; otherwise Node. Instance dispatch builds env from shared helpers, resolves ports/network, runs the container, and waits for process completion. Helper methods translate mounts, labels, images, volumes, and network operations into Dockerode calls.

## Integration Points
Consumes `@scramjet/adapters-common`, `@scramjet/model`, `@scramjet/obj-logger`, `@scramjet/utility`, and `dockerode`. Integrates with STH config, Docker volumes/networks, and runner image selection.

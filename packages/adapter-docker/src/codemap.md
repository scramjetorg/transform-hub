# packages/adapter-docker/src/

## Responsibility
Source implementation for Docker-based sequence discovery, runner container orchestration, helper utilities, and Docker networking setup.

## Design/Patterns
`DockerSequenceAdapter` and `DockerInstanceAdapter` are orchestration layers over `IDockerHelper`. Runner-image selection is a small shared helper, while Docker-specific concerns stay in `dockerode-docker-helper.ts` and `docker-networking.ts`.

## Data & Control Flow
Sequence identification validates prerunner output, decodes package metadata, and maps `engines.bun` / `engines.python3` / default node image via `selectDockerRunnerImage()`. Instance dispatch builds env from shared helpers, resolves ports/network, runs the container, waits for process completion, and handles volume cleanup. Helper methods translate mounts, labels, images, volumes, and network operations into Dockerode calls.

## Integration Points
Consumes `@scramjet/adapters-common`, `@scramjet/model`, `@scramjet/obj-logger`, `@scramjet/utility`, and `dockerode`. Integrates with STH config, Docker volumes/networks, and runner image selection.

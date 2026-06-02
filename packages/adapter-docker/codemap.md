# packages/adapter-docker/

## Responsibility
Docker adapter package for stored-sequence identification, runner container execution, config augmentation, and network bootstrap.

## Design/Patterns
Two-stage runtime: the sequence adapter inspects stored package metadata and selects a runner image; the instance adapter starts that image with computed env, ports, mounts, and cleanup. `DockerodeDockerHelper` keeps Docker API access isolated.

## Data & Control Flow
`augment()` wires CLI options, config defaults, and adapter classes. Sequence flow pulls the prerunner, runs identification, decodes `package.json`, detects `bun`/`python3`/`node` engine hints, and selects the matching runner image. Instance flow derives env, ports, and network state, starts the runner container, waits for completion, captures crash logs, and removes volumes.

## Integration Points
Depends on `@scramjet/adapters-common`, `@scramjet/types`, `@scramjet/model`, `@scramjet/obj-logger`, `dockerode`, and Docker networking. Uses Docker labels/volumes/network `transformhub0` to discover resources and connect STH to runners.

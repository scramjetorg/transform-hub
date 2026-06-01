# packages/adapter-docker/

## Responsibility
Adapter package that exposes Docker-backed sequence identification and instance execution, plus CLI/config augmentation and network bootstrap.

## Design
Two-stage runtime: sequence adapter identifies package metadata and chooses runner image; instance adapter starts the selected image with computed env, ports, and mounts. `DockerodeDockerHelper` isolates Docker API calls.

## Data & Control Flow
`augment()` wires CLI options, config defaults, and adapter classes. Sequence flow: pull prerunner, run identification container, decode package.json, detect language, select runner image. Instance flow: derive ports/env/network, start runner container, wait for exit, capture crash logs, clean up volumes.

## Integration Points
Depends on `@scramjet/adapters-common`, `@scramjet/types`, `dockerode`, and Docker networking. Uses Docker labels/volumes/network `transformhub0` to discover resources and connect STH to runners.

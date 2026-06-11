# packages/adapter-docker/src/

## Responsibility
Source implementation for Docker-based sequence storage and execution.

- Sequence identification and runner-image resolution.
- Runtime container lifecycle orchestration (start/monitor/remove).
- Docker helper abstraction and network bootstrap utilities.

## Design/Patterns
`DockerSequenceAdapter` and `DockerInstanceAdapter` are orchestration layers over `DockerodeDockerHelper`.

- `docker-sequence-adapter.ts`: package metadata discovery and runner-image normalization.
- `docker-instance-adapter.ts`: process dispatch, crash logs, stats, and cleanup.
- `docker-networking.ts`: host/container network reconciliation (`transformhub0`, optional host container join).
- `dockerode-docker-helper.ts`: concrete helper implementing `IDockerHelper`.

## Data & Control Flow
Sequence identification runs the pre-runner image with the mounted package archive and parses streamed JSON; it supports volume-based and direct path-based modes.

Instance dispatch composes runner config from shared decoders/helpers, computes port mappings, attaches host/container env, creates/joins Docker network, then starts the container with consistent labels.

Container operations (streaming logs/output, wait, stats, remove, lookup by label, volume cleanup) are centralized in helper methods to keep adapter logic deterministic.

## Integration Points
Integrates with `@scramjet/adapters-common` (`getRunnerConfigForStoredSequence`, `getRunnerEnvEntries`, runtime detection), shared model/types, and `dockerode`.

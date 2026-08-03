# packages/adapter-docker/

## Responsibility
Implements the Docker runtime adapter plugin for sequence storage and execution.

- Exposes Docker-specific config/CLI augmentation.
- Validates/initializes Docker environment at startup.
- Implements sequence and instance adapters used by the host runtime.

## Design/Patterns
- Uses the host adapter augmentation contract (`augment`, `augmentOptions`, `initialize`).
- Splits concerns into `DockerSequenceAdapter` (identify/list/metadata) and `DockerInstanceAdapter` (run/remove/inspect).
- Centralizes Docker API calls in `DockerodeDockerHelper` to keep adapter logic thin.
- Runner image selection delegates to `selectRunnerImageForEngines` from adapters-common, which uses `selectRuntimeKind` from `@scramjet/symbols` with node > bun > python3 precedence.

## Data & Control Flow
Sequence flow:
1. `initialize` checks daemon connectivity and prepares helper/network state.
2. `identify` mounts an uploaded archive into a temporary volume, runs prerunner, and reads identification JSON.
3. Runtime config is decoded via adapters-common package decoders and runner image is chosen by `selectRunnerImageForEngines`.
4. `list` discovers labeled sequence volumes and reconstructs metadata from stored package configuration.

Instance flow:
1. `dispatch` resolves ports, runner environment and bridge/network mode, then launches runner container.
2. Streaming/logging and lifecycle status are observed through helper methods (`waitForContainer`, `getContainerOutput`, `getContainerInfo`, `getContainerStats`).
3. Cleanup routines remove containers and related sequence volumes.

## Integration Points
- `@scramjet/adapters-common`: runner env config + package decoding + image selection + transport config.
- Docker bridge `transformhub0` and host-container linking logic in `setupDockerNetworking` for cross-container reachability.
- Shared sequence abstraction packages (`@scramjet/types`, `@scramjet/model`, `@scramjet/utility`).
- Verser2 runner transport config injected via `getRunnerTransportEnv()` from adapters-common, producing `SCRAMJET_RUNNER_TRANSPORT_CONFIG` in runner container environment.

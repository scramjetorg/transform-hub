# packages/adapter-kubernetes/src/

## Responsibility
Source implementation for Kubernetes-based sequence persistence and runner pod lifecycle.

- `kubernetes-sequence-adapter.ts`: identify/list/remove of stored sequences.
- `kubernetes-instance-adapter.ts`: create/start/monitor/cleanup runner pods.
- `kubernetes-client-adapter.ts`: low-level Kubernetes calls and typed result handling.
- `kubernetes-config-decoder.ts`: adapter schema/validation for runtime config.

## Design/Patterns
- Shared adapters-common decoding and env helpers are reused (`getRunnerConfigForStoredSequence`, `getRunnerEnvEntries`).
- `KubernetesClientAdapter` centralizes client reuse, namespace defaults, watchless polling and cleanup semantics.
- Sequence archives are stored as tar+gzip with side-car metadata to avoid repeated expensive extraction.
- `KubernetesInstanceAdapter` enforces adapter config (limits, quotas, timeouts) before scheduling runner pods.

## Data & Control Flow
1. Adapter config is validated once and injected into adapters.
2. Sequence `identify` writes incoming package payload, optionally inflates it in a dedicated folder, and reads package metadata through common decoders.
3. `list` enumerates stored sequence dirs while filtering hidden/system entries.
4. On dispatch, the instance adapter calculates runner image from `engines`, checks quotas, creates pod spec, sets env/labels/commands, and applies resource limits.
5. Pod runtime is started, sequence bytes are piped via `tar` into `unpack.sh`, and state is awaited (`Running` then terminal) with crash-log retrieval.
6. On completion/failure, pod is removed and exit code is returned.

## Integration Points
- `@scramjet/adapters-common` for language/runtime/image selection and package validation.
- `@kubernetes/client-node` for cluster operations.
- `tar`, filesystem helpers, and namespace/auth config from Kubernetes context.
- Host adapter registration via `packages/runner` (`initializeRuntimeAdapters`).

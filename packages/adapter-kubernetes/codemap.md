# packages/adapter-kubernetes/

## Responsibility
Implements the Kubernetes runtime adapter package:

- Registers Kubernetes adapter CLI/config surfaces.
- Decodes and validates adapter runtime config (`namespace`, host URL, images, resource/quota settings).
- Provides sequence/instance adapters and Kubernetes client initialization.

## Design/Patterns
- `adapterConfigDecoder` is strict and normalized in package scope (`kubernetes-config-decoder.ts`).
- `KubernetesClientAdapter` encapsulates Kubernetes API client creation and namespace-specific interactions.
- `selectRunnerImageForEngines` and adapters-common decoders provide shared runtime decision logic, using `selectRuntimeKind` from `@scramjet/symbols` with node > bun > python3 precedence.

## Data & Control Flow
1. `augmentOptions` merges adapter defaults (pod/namespace/cpu/memory/resource settings, timeouts, image map).
2. `initialize` loads kube context and resolves config from CLI/env (`namespace`, `sthPodHost`, runner images, `sequencesRoot`).
3. Sequence adapter (`identify`/`list`) decodes package metadata, writes/reads sequence payload archives, and keeps cached compressed metadata in `.compressed`.
4. Instance adapter dispatch:
   - validates runner config and quota/limits,
   - creates a runner pod with declared labels/env/cmd,
   - streams packed sequence directory into runner container entrypoint (`untar` path),
   - waits for running state and then returns lifecycle completion code.
5. Monitoring hooks expose pod status, crash logs, and explicit cleanup by pod deletion.

## Integration Points
- `@scramjet/adapters-common` for runtime env, image decision, and package JSON decoders.
- `@kubernetes/client-node` for core cluster operations and `tar` stream compression/decompression utilities.
- Host-level adapter wiring (`packages/runner`) via `IAdapterAugmentation` contract.
- Kubernetes control plane config (namespace/auth/limits), plus startup defaults from package config and CLI.
- Verser2 runner transport config injected via `getRunnerTransportEnv()` from adapters-common, producing `SCRAMJET_RUNNER_TRANSPORT_CONFIG` in runner pod environment.

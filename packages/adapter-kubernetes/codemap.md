# packages/adapter-kubernetes/

## Responsibility
Kubernetes adapter package for sequence storage, runner pod execution, CLI/config augmentation, and client initialization.

## Design/Patterns
Sequence and instance adapters share a decoded adapter config. `KubernetesClientAdapter` wraps client-node APIs with retry/auth-refresh logic; pod/image selection is centralized in a small helper and driven by engine hints.

## Data & Control Flow
`augment()` registers CLI options, config defaults, and adapters. `adapterConfigDecoder` validates required namespace/host/image settings plus optional quota, timeout, and resource overrides. Instance flow validates config, checks quota, chooses the runner image (`bun`/`python3`/node), creates a runner pod, streams the sequence archive via `tar`, waits for pod completion, and removes the pod.

## Integration Points
Uses `@scramjet/adapters-common`, `@scramjet/types`, `@scramjet/model`, `@scramjet/symbols`, `@scramjet/utility`, `@kubernetes/client-node`, `tar`, and YAML/OS networking helpers. Depends on cluster auth config/service account, namespace/quota settings, and STH host connectivity.

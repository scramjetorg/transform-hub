# packages/adapter-kubernetes/

## Responsibility
Adapter package for Kubernetes-backed sequence storage and runner pod execution, including CLI/config augmentation and client initialization.

## Design
Sequence and instance adapters share a decoded adapter config. `KubernetesClientAdapter` wraps client-node APIs with retry/auth-refresh logic; pod/image selection is driven by sequence language/`engines.python3`.

## Data & Control Flow
`augment()` registers CLI options, config defaults, and adapters. Sequence flow stores unpacked sequences on disk and reconstructs sequence config from `package.json`. Instance flow validates config, checks quota, chooses runner image, creates a runner pod, streams sequence payload via `tar`, waits for pod completion, and removes the pod.

## Integration Points
Uses `@scramjet/adapters-common`, `@scramjet/types`, `@scramjet/model`, `@scramjet/symbols`, `@scramjet/utility`, `@kubernetes/client-node`, and `tar`. Depends on cluster auth config/service account, namespace/quota settings, and STH host connectivity.

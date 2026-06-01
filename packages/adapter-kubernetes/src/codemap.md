# packages/adapter-kubernetes/src/

## Responsibility
Source implementation for Kubernetes sequence persistence, runner pod lifecycle management, and Kubernetes client access.

## Design
`KubernetesSequenceAdapter` handles unpack/store/list/remove for sequences. `KubernetesInstanceAdapter` handles pod creation, env/image selection, compression/unpack transfer, and teardown. `KubernetesClientAdapter` centralizes API calls, retries, and credential reloads.

## Data & Control Flow
Config is decoded once per adapter. Sequence flow writes compressed archives and reconstructs config via shared helpers. Instance flow resolves STH host, builds runner env, picks Python vs Node image from `engines.python3`, creates a pod, waits for Running/terminal state, streams tar input into `unpack.sh`, then waits for exit and deletes the pod.

## Integration Points
Consumes shared adapter helpers plus Kubernetes client APIs, YAML/OS/network utilities, and `RunnerExitCode`/`SequenceAdapterError`. Integrates with namespace auth, quotas, pod labels, and sequence storage under `sequencesRoot/.compressed`.

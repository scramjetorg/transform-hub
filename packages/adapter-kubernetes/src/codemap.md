# packages/adapter-kubernetes/src/

## Responsibility
Source implementation for Kubernetes sequence persistence, runner pod lifecycle management, config decoding, and Kubernetes client access.

## Design/Patterns
`KubernetesSequenceAdapter` handles unpack/store/list/remove for sequences. `KubernetesInstanceAdapter` handles pod creation, env/image selection, archive transfer, and teardown. `KubernetesClientAdapter` centralizes API calls, retries, and credential reloads. `adapterConfigDecoder` is the single config gate for adapter settings.

## Data & Control Flow
Config is decoded once per adapter instance. Sequence flow writes compressed archives and reconstructs config via shared helpers. Instance flow resolves the STH host, builds runner env entries, picks the runner image from `engines.bun` / `engines.python3` / default node, creates a pod, waits for Running/terminal state, streams tar input into `unpack.sh`, then waits for exit and deletes the pod.

## Integration Points
Consumes shared adapter helpers plus Kubernetes client APIs, YAML/OS/network utilities, and `RunnerExitCode`/`SequenceAdapterError`. Integrates with namespace auth, quotas, pod labels, and sequence storage under `sequencesRoot/.compressed`.

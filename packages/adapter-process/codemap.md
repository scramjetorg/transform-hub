# package adapter-process

## Responsibility
Local process runtime adapter package that runs sequences as direct host processes for development/edge execution.

- Registers adapter configuration/defaults (`sequencesRoot`, safe-operation limits, instance requirements).
- Delegates lifecycle to `ProcessSequenceAdapter` and `ProcessInstanceAdapter`.

## Design/Patterns
- Light-weight implementation of the adapter augmentation interface.
- Minimal orchestration layer: sequence metadata + process execution with `@scramjet/runner` utilities.
- Uses shared environment helpers from `@scramjet/adapters-common` (runner config + env serialization).

## Data & Control Flow
- `augment` injects sequence directory settings and `instanceRequirements`.
- `identify`/`list` leverage adapters-common decoders and package file scanning to surface runnable sequence configs.
- `dispatch` resolves runtime env, spawns the selected runner binary/process, and attaches stdin/stdout/stderr/cancel handlers.
- Instance state and cleanup are derived from process exit/kill paths and `waitFor` completion.
- Failure handling preserves return codes and writes diagnostic logs via host logger adapter interface.

## Integration Points
- Shared packages: `@scramjet/runner`, `@scramjet/model`, `@scramjet/adapters-common`, `@scramjet/sth-config`.
- Uses `getRunnerTransportEnv()` from adapters-common to inject `SCRAMJET_RUNNER_TRANSPORT_CONFIG` verser2 transport env into the spawned runner process.
- Host discovers and executes this adapter via runner package registration.
- Used as non-containerized execution path and thus bypasses Docker/Kubernetes orchestration.

# packages/adapter-process/src/

## Responsibility

Source implementation for process-based sequence storage and execution.

- `process-sequence-adapter.ts`: identify/list/remove sequences stored on local filesystem.
- `process-instance-adapter.ts`: spawn and manage runner child processes.
- `index.ts`: adapter augmentation surface (initialize, augmentOptions, augmentConfig).

## Design/Patterns

- **Lightweight orchestration**: sequences are simply tar-extracted into `sequencesRoot` directories; runner is spawned as a child process using `@scramjet/runner` entry.
- **Shared adapter-common decoders**: `getRunnerConfigForStoredSequence("process", …)` from `@scramjet/adapters-common` provides metadata / env resolution.
- **Transport config injection**: uses `getRunnerTransportEnv()` to set `SCRAMJET_RUNNER_TRANSPORT_CONFIG` env var for the runner child process.
- **Runtime kind selection**: delegates to `selectRuntimeKind` from `@scramjet/symbols` to determine runner binary from engine metadata.

## Data & Control Flow

1. `identify()` unpacks the incoming tarball, writes to `sequencesRoot/<id>`, then reads `package.json` to build `SequenceConfig`.
2. `list()` scans `sequencesRoot` for subdirectories and builds configs via shared decoders.
3. `dispatch()` resolves runner command, builds env (including transport config), spawns the runner process with `spawn()`, and tracks crash logs.
4. `waitUntilExit()` polls the runner process (or reads the exit-code file written by the runner on process exit).
5. `remove()` deletes the sequence directory.

## Integration Points

- Relies on `@scramjet/runner` entrypoint and `@scramjet/adapters-common` for config/env.
- Uses `@scramjet/config` for development-mode env passthrough.
- Integrates with host via `IAdapterAugmentation` contract in `index.ts`.

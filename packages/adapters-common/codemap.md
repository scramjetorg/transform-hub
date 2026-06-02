# packages/adapters-common/

## Responsibility
Shared adapter helpers for stored-sequence metadata loading, language detection, and runner env shaping for runtime adapters.

## Design/Patterns
Small functional helpers with a shared `package.json` decoder. Adapter-specific sequence types are selected with conditional typing; env shaping is data-in/data-out.

## Data & Control Flow
`getRunnerConfigForStoredSequence()` validates stored `package.json`, copies known fields into a typed `SequenceConfig`, and derives `language` from `engines`/`main`. `detectLanguage()` now treats `bun`, `python3`, and `node` engine hints explicitly before falling back to the entrypoint extension. `getRunnerEnv*()` converts `RunnerEnvConfig` into serialized env entries.

## Integration Points
Consumed by `adapter-docker` and `adapter-kubernetes` for sequence reconstruction and runner env construction. Uses `@scramjet/types`, `@scramjet/utility`, filesystem APIs, and `ts.data.json`.

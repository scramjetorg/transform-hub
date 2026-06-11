# packages/adapters-common/

## Responsibility
Cross-adapter helper library for stored-sequence metadata, runtime detection, and runner-environment shaping.

## Design/Patterns
- Decoder-first architecture: validate and normalize sequence `package.json` once via shared codecs.
- Small functional helpers with typed outputs (`detectLanguage`, `selectRunnerImageForEngines`, `getRunnerConfigForStoredSequence`).
- Language/image/env decisions are centralized so every runtime adapter behaves consistently.

## Data & Control Flow
- `sequencePackageJSONDecoder` validates `package.json` metadata before any adapter dispatch.
- `getRunnerConfigForStoredSequence()` merges package data with adapter conventions (entrypoint, runner env vars, ports, command metadata).
- `detectLanguage()` resolves runtime preference using `engines.bun` -> `engines.python3` -> `engines.node` with extension fallback.
- `selectRunnerImageForEngines()` chooses the effective runner image from available overrides/defaults.
- `getRunnerEnvEntries()` serializes runner environment into container/process env arrays.

## Integration Points
- Shared by `adapter-docker`, `adapter-kubernetes`, and `adapter-process`.
- Provides the canonical data contracts used by adapter sequence and instance flows.
- Depends on `@scramjet/types`, `@scramjet/utility`, filesystem utilities, and `ts.data.json`.

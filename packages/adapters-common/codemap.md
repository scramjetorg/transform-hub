# packages/adapters-common/

## Responsibility
Shared adapter utilities for sequence metadata loading, language detection, and runner env shaping used by Docker and Kubernetes adapters.

## Design
Small pure helpers plus a shared JSON decoder. Types are adapter-agnostic where possible; adapter-specific config is selected via conditional typing.

## Data & Control Flow
`getRunnerConfigForStoredSequence()` reads `package.json`, validates it, derives `language`, and materializes a typed `SequenceConfig`. `detectLanguage()` prefers `engines.python3` / `engines.node`, then falls back to `main` extension. `getRunnerEnv*()` maps a `RunnerEnvConfig` into container-friendly env vars.

## Integration Points
Consumed by `adapter-docker` and `adapter-kubernetes` for sequence config reconstruction and runner env construction. Uses `@scramjet/types`, `@scramjet/utility`, and `ts.data.json`.

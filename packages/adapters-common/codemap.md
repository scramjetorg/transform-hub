# packages/adapters-common/

## Responsibility

Cross-adapter helper library for stored-sequence metadata, runtime detection, runner-environment shaping, and verser2 runner transport configuration.

## Design/Patterns

- Decoder-first architecture: validate and normalize sequence `package.json` once via shared codecs.
- Small functional helpers with typed outputs (`detectLanguage`, `selectRunnerImageForEngines`, `getRunnerConfigForStoredSequence`).
- **Transport config generation**: `getRunnerTransportEnv()` produces the `SCRAMJET_RUNNER_TRANSPORT_CONFIG` JSON (verser2) used by all adapters (docker, kubernetes, process) when dispatching runner processes.
- Language/image/env decisions are centralized so every runtime adapter behaves consistently.

## Data & Control Flow

- `sequencePackageJSONDecoder` validates `package.json` metadata before any adapter dispatch.
- `getRunnerConfigForStoredSequence()` merges package data with adapter conventions (entrypoint, runner env vars, ports, command metadata).
- `detectLanguage()` resolves runtime preference using `engines.bun` -> `engines.python3` -> `engines.node` with extension fallback.
- `selectRunnerImageForEngines()` chooses the effective runner image from available overrides/defaults.
- `getRunnerEnvEntries()` serializes runner environment into container/process env arrays.
- `getRunnerTransportEnv()` builds verser2 transport config (`SCRAMJET_RUNNER_TRANSPORT_CONFIG`) from STH verser2 configuration, including host URL, route domain, guest ID, broker ID, TLS trust bundle, and lease settings.
- `buildRunnerTrustBundle()` constructs the CA trust bundle from STH-local and manager CA certificates.

## Integration Points

- Shared by `adapter-docker`, `adapter-kubernetes`, and `adapter-process`.
- Provides the canonical data contracts used by adapter sequence and instance flows.
- Transport env function integrates with STH verser2 configuration (`STHConfiguration.verser2`).
- Depends on `@scramjet/types`, `@scramjet/utility`, filesystem utilities, and `ts.data.json`.

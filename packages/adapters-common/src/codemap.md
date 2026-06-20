# packages/adapters-common/src/

## Responsibility

Implementation layer for shared adapter utilities used during sequence bootstrap, runtime process creation, and verser2 runner transport configuration.

- Package `package.json` validation/decoding.
- Runner config reconstruction.
- Runner env serialization and runtime/image selection.
- Verser2 runner transport env generation (`getRunnerTransportEnv`, `buildRunnerTrustBundle`).

## Design/Patterns

- File-scoped utilities with no runtime side effects.
- Shared JSON decoders (`validate-sequence-package-json.ts`) are source of truth for required sequence fields.
- Helper composition (`utils.ts` + `get-runner-env.ts`) avoids adapter-specific duplication.
- Transport env generation (`get-runner-env.ts`) includes verser2 runner host configuration with TLS trust bundle assembly, default domain derivation, and lease timeout propagation.

## Data & Control Flow

- `validate-sequence-package-json.ts` defines and validates the schema for stored sequence metadata.
- `utils.ts` provides `getRunnerConfigForStoredSequence()`, `selectRunnerImageForEngines()`, and `detectLanguage()` to produce a normalized runtime config.
- `get-runner-env.ts` provides:
  - `getRunnerEnvVariables()` / `getRunnerEnvEntries()` — converts normalized config into env array payload expected by all runtimes.
  - `getRunnerTransportEnv()` — builds the `SCRAMJET_RUNNER_TRANSPORT_CONFIG` env var for verser2 runner connectivity, used by all adapter `dispatch()` methods.
  - `buildRunnerTrustBundle()` — assembles CA trust chain for verser2 TLS.

## Integration Points

- Consumed by `adapter-docker`, `adapter-kubernetes`, and `adapter-process` source adapters.
- Transport env consumed by all three adapter packages during runner process dispatch.
- Uses `@scramjet/types`, `@scramjet/utility`, and `ts.data.json` codecs for type-safe data conversion.

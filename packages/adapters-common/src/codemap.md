# packages/adapters-common/src/

## Responsibility
Implementation layer for shared adapter utilities used during sequence bootstrap and runtime process creation.

- Package `package.json` validation/decoding.
- Runner config reconstruction.
- Runner env serialization and runtime/image selection.

## Design/Patterns
- File-scoped utilities with no runtime side effects.
- Shared JSON decoders (`validate-sequence-package-json.ts`) are source of truth for required sequence fields.
- Helper composition (`utils.ts` + `get-runner-env.ts`) avoids adapter-specific duplication.

## Data & Control Flow
- `validate-sequence-package-json.ts` defines and validates the schema for stored sequence metadata.
- `utils.ts` provides `getRunnerConfigForStoredSequence()`, `selectRunnerImageForEngines()`, and `detectLanguage()` to produce a normalized runtime config.
- `get-runner-env.ts` converts normalized config into env array payload expected by all runtimes.

## Integration Points
- Consumed by `adapter-docker`, `adapter-kubernetes`, and `adapter-process` source adapters.
- Uses `@scramjet/types`, `@scramjet/utility`, and `ts.data.json` codecs for type-safe data conversion.

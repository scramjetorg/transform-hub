# packages/adapters-common/src/

## Responsibility
Implementation of shared adapter helpers: runner env generation, sequence package validation, and stored-sequence config reconstruction.

## Design/Patterns
Functional helpers with minimal state. Validation is centralized in `sequencePackageJSONDecoder`; config reconstruction reuses the same decoded schema across adapters.

## Data & Control Flow
`validate-sequence-package-json.ts` defines the shared `package.json` schema. `utils.ts` reads and validates stored sequence metadata, then builds adapter-specific config plus detected language. `get-runner-env.ts` serializes runtime config into env entries.

## Integration Points
Imported by Docker/Kubernetes sequence and instance adapters. Relies on `@scramjet/types`, `@scramjet/utility`, filesystem APIs, and `ts.data.json`.

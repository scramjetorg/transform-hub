# packages/adapters-common/src/

## Responsibility
Implementation of shared adapter helpers: runner env generation, sequence package validation, and sequence config reconstruction from stored artifacts.

## Design
Functional helpers with minimal state. Validation is centralized in `sequencePackageJSONDecoder`; config reconstruction uses the same validated schema across adapters.

## Data & Control Flow
`validate-sequence-package-json.ts` defines the schema for `package.json` fields used by adapters. `utils.ts` loads and validates stored sequence metadata, then computes adapter-specific config and language. `get-runner-env.ts` serializes config into env entries/vars.

## Integration Points
Imported by Docker/Kubernetes sequence and instance adapters. Relies on `@scramjet/types`, `@scramjet/utility`, filesystem APIs, and `ts.data.json`.

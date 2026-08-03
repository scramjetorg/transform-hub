# packages/api-router/src/bin/

## Responsibility

CLI tooling for the `@scramjet/api-router` package. Provides a code-generation entrypoint for producing OpenAPI 3.1 documents from route manifests.

## Modules

### `generate.ts` — OpenAPI generator CLI

Standalone Node.js script that loads a route manifest from a TypeScript/JavaScript module and writes an OpenAPI 3.1 JSON document.

Usage:
```bash
scramjet-api-router-generate <api-definition-module-path> [output.json]
```

Flow:
1. Parses CLI args via `@scramjet/config` `printHelpAndExitIfRequested()`.
2. Dynamic `import()` of the target module at the resolved path.
3. `loadManifestFromSchemaModule()` (from `schema-mode.ts`) extracts a `RouteManifest` (supports `.manifest`, `.collect()`, or `.default` exports).
4. `generateOpenApi()` (from `openapi.ts`) produces an OpenAPI 3.1 document.
5. Writes to file or stdout.

## Integration Points

- Relies on `schema-mode.ts` for manifest extraction.
- Relies on `openapi.ts` for document generation with Zod-to-JSON-Schema conversion.
- Uses `@scramjet/config` for argument parsing and help generation.

# packages/utility/src/typeguards/dto/

## Files

| File | Role |
|------|------|
| `sequence-start.ts` | `isStartSequenceDTO`, `isStartSequenceEndpointPayloadDTO` — validates start sequence request DTO shapes (id, appConfig, args, instanceId, logLevel, exposePath, restartLimit, required, keepAlive, sequenceName, instanceName). |
| `instance-set.ts` | `isSetSequenceEndpointPayloadDTO` — validates instance/sequence set endpoint payload DTO shapes. Also re-exports `isStartSequenceDTO`/`isStartSequenceEndpointPayloadDTO` with narrower validation logic (no sequenceName/instanceName normalization, no keepAlive/restartLimit/required). |

## Responsibility

Provides runtime type guard functions specifically for data transfer object (DTO) validation used in API endpoints. These guards check the complete shape of incoming request payloads with descriptive throw-on-error validation.

## Design/Patterns

- Each DTO guard returns a `value is ...DTO` type predicate for TypeScript narrowing.
- Guards throw descriptive `TypeError` messages on invalid fields for debugging.
- Re-exported through `packages/utility/src/typeguards/index.ts` for convenient access.

## Integration Points

- Used by API endpoint handlers and middleware for request body validation.
- Imported via the `typeguards` barrel from `@scramjet/utility`.

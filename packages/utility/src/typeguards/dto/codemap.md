# packages/utility/src/typeguards/dto/

## Files

| File | Role |
|------|------|
| `sequence-start.ts` | `isStartSequenceDTO`, `isStartSequenceEndpointPayloadDTO` — validates start sequence request DTO shapes. |
| `instance-set.ts` | `isSetSequenceEndpointPayloadDTO` — validates instance/sequence set endpoint payload DTO shapes. |

## Responsibility

Provides runtime type guard functions specifically for data transfer object (DTO) validation used in API endpoints. These guards check the complete shape of incoming request payloads.

## Design/Patterns

- Each DTO guard returns a `value is ...DTO` type predicate for TypeScript narrowing.
- Re-exported through `packages/utility/src/typeguards/index.ts` for convenient access.

## Integration Points

- Used by API endpoint handlers and middleware for request body validation.
- Imported via the `typeguards` barrel from `@scramjet/utility`.

# Package Atlas: host/src/lib

## Responsibility

Shared host-side library code for service discovery and related low-level utilities.

## Design/Patterns

- Small, focused helpers with minimal state.
- Domain objects encapsulate validation and string conversion.

## Data & Control Flow

- Service-discovery identifiers are represented as lightweight wrapper objects.
- Validation is performed locally against a constrained topic-name pattern.
- `toString()` and `isValid()` expose the stored topic name for downstream use.

## Integration Points

- Used by host service-discovery code that needs validated topic identifiers.
- Emits plain string identifiers for transport, logging, and lookup keys.

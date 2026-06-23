# packages/cli/src/events/

## Responsibility

Event type definitions for CLI internal event system, primarily used for shell completion integration.

## Modules

### `completerDetails.ts` (6 lines)

Defines the `CompleterDetailsEvent` and `CompleterDetailsCallback` types for bash completion integration.

- `CompleterParams`: `string[] | "filenames" | "dirnames"` — completion value types.
- `CommandCompleterDetails`: maps argument/option names to their `CompleterParams`.
- `CompleterDetailsEvent = "CompleterDetails"`: event name constant.
- `CompleterDetailsCallback`: callback type for handling completion details.

## Integration Points

- Used by `lib/commands/completion.ts` to register completion handlers.
- Bash completion scripts in `scripts/completion/` emit completion details events.

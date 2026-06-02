# Package Atlas: utility/src/file

## Responsibility

File abstraction helpers that choose concrete file implementations by extension.

## Design/Patterns

- Factory-style entrypoint (`FileBuilder`) hides concrete file classes.
- Extension-based dispatch keeps file-type selection centralized.
- Re-exports concrete implementations and the shared `File` type.

## Data & Control Flow

- `FileBuilder(path)` inspects `extname(path)`.
- `.json` maps to `JsonFile`, `.yaml`/`.yml` map to `YamlFile`, all others default to `TextFile`.

## Integration Points

- Consumed by packages that need a file wrapper without branching on extension.
- Depends on path utilities plus local text/json/yaml file implementations.

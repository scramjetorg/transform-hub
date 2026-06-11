# packages/runner-bun/src/

## Responsibility

Runtime helpers for Bun execution mode: boot-config parsing/validation and the top-level helper surface used by Bun bootstrap and other packages.

## Design / Patterns

- **Strict parser/validator** for Bun boot JSON mirroring Node runtime schema.
- **Small utility module boundary** so Bun CLI logic stays lightweight.
- **Purely functional exports** (`readBootConfig`, `parseBootConfigPathFromArgv`, `validateBootConfig`) used both by runtime and tests.

## Data & Control Flow

`boot-config.ts` ingests `argv[2]`, resolves absolute path when needed, parses JSON, validates required/optional fields (IDs, ports, instance metadata, arrays/objects), and returns strongly typed `RunnerBunBootConfig`.

`index.ts` exposes contract symbols/types so dependent tooling can share runtime identity and parser helpers.

## Integration Points

Uses `@scramjet/types` schema fields and aligns with `@scramjet/runner-node` contract for delegated runs (`instancesServerHost/Port`, monitoring/context fields, log level and expose settings).

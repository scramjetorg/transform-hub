# packages/runner-bun/src/

## Responsibility

Runtime helpers for Bun execution mode: boot-config parsing/validation (including `verser2Runtime` block), verser2 guest/broker creation, and the top-level helper surface used by Bun bootstrap and other packages.

## Design / Patterns

- **Strict parser/validator** for Bun boot JSON mirroring Node runtime schema, with validated `verser2Runtime` block (`hostUrl`, `runnerGuestId`, `runnerRouteDomain`, `hubBrokerId`, optional TLS/timeouts).
- **Verser2 runtime abstraction**: `verser2-runtime.ts` contains `BunSequenceApiExposure` (deferred handler attachment to guest), `createBunSequenceGuest()`, `startBunSequenceGuest()`, and `createBunHubFetch()`.
- **Small utility module boundary** so Bun CLI logic stays lightweight.
- **Purely functional exports** (`readBootConfig`, `parseBootConfigPathFromArgv`, `validateBootConfig`) used both by runtime and tests.

## Data & Control Flow

`boot-config.ts` ingests `argv[2]`, resolves absolute path when needed, parses JSON, validates required/optional fields (including verser2 runtime config), and returns strongly typed `RunnerBunBootConfig`.

`verser2-runtime.ts` provides guest factory and lifecycle helpers consumed by the Bun entrypoint for verser2-based API exposure and hub fetch.

`index.ts` exposes contract symbols/types so dependent tooling can share runtime identity and parser helpers.

## Integration Points

Uses `@scramjet/types` schema fields, `@signicode/verser2-guest-bun` for verser2 guest/broker creation, and aligns with `@scramjet/runner-node` contract for delegated runs (`instancesServerHost/Port`, monitoring/context fields, log level and expose settings).

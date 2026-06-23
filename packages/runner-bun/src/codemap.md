# packages/runner-bun/src/

## Responsibility

Runtime helpers for Bun execution mode: boot-config parsing/validation (including `verser2Runtime` block), verser2 guest/broker creation, and the top-level helper surface used by Bun bootstrap and other packages.

## Design / Patterns

- **Strict parser/validator** for Bun boot JSON mirroring Node runtime schema, with validated `verser2Runtime` block (`hostUrl`, `runnerGuestId`, `runnerRouteDomain`, `hubBrokerId`, `hubTargetDomain`, optional TLS/timeouts/`minWaitingStreams`). `validateBootConfig()` and `validateVerser2RuntimeConfig()` provide deep validation with descriptive error messages.
- **Verser2 runtime abstraction**: `verser2-runtime.ts` contains `BunSequenceApiExposure` (deferred handler attachment to guest), `createBunSequenceGuest()`, `startBunSequenceGuest()`, `createBunHubFetch()`, and `tlsOptions()` for TLS field extraction.
- **Small utility module boundary** so Bun CLI logic stays lightweight.
- **Purely functional exports** (`readBootConfig`, `parseBootConfigPathFromArgv`, `validateBootConfig`) used both by runtime and tests.

## Data & Control Flow

`boot-config.ts` ingests `argv[2]`, resolves absolute path when needed, parses JSON, validates required/optional fields (including verser2 runtime config), and returns strongly typed `RunnerBunBootConfig`.

`verser2-runtime.ts` provides guest factory (`createBunSequenceGuest`), lifecycle helpers (`startBunSequenceGuest`), `BunSequenceApiExposure` for deferred handler attachment, and `createBunHubFetch` for brokerage — consumed by the Bun entrypoint for verser2-based API exposure and hub fetch.

`index.ts` exports contract symbols/types (`runnerBunRuntime`, `RunnerBunBootConfig`, `RunnerBunVerser2RuntimeConfig`) so dependent tooling can share runtime identity and parser helpers.

## Integration Points

Uses `@scramjet/types` schema fields, `@signicode/verser2-guest-bun` for verser2 guest/broker creation, and aligns with `@scramjet/runner-node` contract for delegated runs (`instancesServerHost/Port`, monitoring/context fields, log level and expose settings).

Exported functions (`readBootConfig`, `validateBootConfig`, `validateVerser2RuntimeConfig`) consumed by `bin/runner-bun.ts` and `test/boot-config.test.js`.

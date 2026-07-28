# packages/cli/src/lib/commands/

## Responsibility

Command descriptor definitions for the `si` CLI. Each module exports a `CommandDescriptor` tree built with `@scramjet/config` `cmd()` that defines arguments, options, aliases, and action handlers for a CLI domain. Native v2 Verser2 dispatch is incorporated through the shared capability facade in `capabilities.ts` and the broker bridge in `api.ts`.

## Modules

| File | Command(s) | Alias |
|------|-----------|-------|
| `api.ts` | `api` — raw Verser2 API calls: `api get|post|put|patch|delete|head` with body/header/query/stream/output options; `api endpoints` as explicit exit-80 placeholder. Exports `createVerser2CliTransport()`, `createVerifiedVerser2Session()`, `mapApiError()`, and `ApiCommandError` shared by both raw and named paths | — |
| `config.ts` | `config` — profile management (list, set, show, edit, restore) | — |
| `configControls.ts` | Config-control subcommands for space/hub/sequence/instance: `config get|set|reload`. Hub config get is native (bound v2 route); all other leaves are deterministic exit-80 `CapabilityUnavailableError` placeholders | — |
| `hub.ts` | `hub` — Hub operations: `use`, `list`, `info`, `disconnect`, `delete`, `logs`, `audit`, `load`, `version`, `config get\|set\|reload`. Verser2-aware: native named commands via `getNativeCapabilities()` facade when profile active; HTTP/v1 client fallback without | — |
| `scope.ts` | `scope` — Scope management | — |
| `sequence.ts` | `sequence` — Sequence lifecycle: `list`, `use`, `info`, `pack`, `send`, `update`, `start`, `deploy`, `delete`, `prune`, `config get\|set\|reload`. Native v2 upload/start/delete paths; HTTP/v1 fallback | `seq` |
| `instance.ts` | `instance` — Instance lifecycle: `list`, `use`, `info`, `health`, `log`, `kill`, `stop`, `restart`, `input`, `inout` (exit 80), `output`, `stdio`/`attach`, `event emit\|on`, `stdin`, `stderr`, `stdout`, `config get\|set\|reload`. Native v2 paths with explicit exit-80 for `inout` and `event on --stream` | `inst` |
| `space.ts` | `space` — Space management: `info`, `list`, `use`, `audit`, `logs`, `version`, `access create\|list\|revoke`, `config get\|set\|reload`. Verser2-native for info/list/use/audit/logs/version; middleware-only access leaves exit 80 | `spc` |
| `topic.ts` | `topic` — Topic operations: `create`, `delete`, `get` (hub/space scope), `send` (hub/space scope), `list` (hub/space scope). Scope routing through `native.topicPath()` for Verser2 profiles | — |
| `store.ts` | `store` — Store operations: `list`, `send` (exit 80), `delete` (exit 80), `prune`. Verser2-native for list/prune; send/delete are deferred until server binding | — |
| `init.ts` | `init` — CLI initialization (local only) | — |
| `util.ts` | `util` — Utility operations (local only) | — |
| `completion.ts` | `completion` — Shell completion setup. `action` handler outputs the generated shell script; `install`/`uninstall` subcommands are unconditional registration | — |
| `developerTools.ts` | Developer utility commands (`cmdToJson`, `cmdToList`, `cmdToMd`) — development mode only | — |
| `index.ts` | Aggregates all command descriptors into `commandDescriptors[]`; dynamically imports `completion` and `developerTools` conditionally | — |
| `si.ts` | Placeholder for legacy `si` root command resolution | — |

## Design/Patterns

- Each command uses a fluent builder API: `cmd(name) → .alias() → .desc() → .argument() → .option() → .action()`.
- Action handlers are async functions that first check `getNativeCapabilities()` for an active Verser2 profile. When present, they dispatch through the native facade (`.json()`, `.managerJson()`, `.rootJson()`, `.spaceJson()`, `.upload()`, `.stream()`); when absent, they fall through to HTTP(v1 client helpers (`getHostClient()`, `getMiddlewareClient()`). Unsupported operations throw `CapabilityUnavailableError` (exit 80).
- Commands are conditionally included: `completionCommand` is registered unconditionally; `developerToolsCommand` only in development mode.
- `sequence` and `instance` commands use helper modules for complex operations (pack/send/start, kill/restart).
- Config-control leaves (`configControls.ts`) are a shared factory consuming a `resource` string and registering the three-leaf `config get|set|reload` tree, with a native v2 route only for `hub config get`.

## Integration Points

- All commands registered in `index.ts` and consumed by `bin/index.ts`.
- Use `@scramjet/api-client` for Hub API operations and `@scramjet/middleware-api-client` for Platform API (HTTP/v1 fallback only).
- Verser2 native dispatch imports from `../capabilities` (`getNativeCapabilities`, `CapabilityUnavailableError`) and from `./api` (`createVerser2CliTransport`, `createVerifiedVerser2Session`, `ApiCommandError`, `mapApiError`).
- `@scramjet/client-utils` `ClientError` is used for typed error handling in `instance.ts`.
- `api.ts` depends on `@signicode/verser2-guest-node` for the broker connection, `@scramjet/api-router` for the `RoutedBrokerTransport` contract, and `@scramjet/config` for profile validation (`validateOutboundVerser2Profile`).

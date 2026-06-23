# packages/cli/src/lib/commands/

## Responsibility

Command descriptor definitions for the `si` CLI. Each module exports a `CommandDescriptor` tree built with `@scramjet/config` `cmd()` that defines arguments, options, aliases, and action handlers for a CLI domain.

## Modules

| File | Command(s) | Alias |
|------|-----------|-------|
| `config.ts` | `config` — profile management (list, set, show, edit, restore) | — |
| `hub.ts` | `hub` — Hub operations (list, use, info) | — |
| `instance.ts` | `instance` — Instance lifecycle (list, use, info, health, stdout, stdin, stderr, event, kill, restart) | `inst` |
| `scope.ts` | `scope` — Scope management | — |
| `sequence.ts` | `sequence` — Sequence lifecycle (list, use, info, send, deploy, start, stop, clean) | `seq` |
| `space.ts` | `space` — Space management | — |
| `topic.ts` | `topic` — Topic operations (list, info, subscribe, publish) | — |
| `store.ts` | `store` — Store operations | — |
| `init.ts` | `init` — CLI initialization | — |
| `util.ts` | `util` — Utility operations | — |
| `completion.ts` | `completion` — Shell completion setup (Linux only) | — |
| `developerTools.ts` | Developer utility commands (development mode only) | — |
| `index.ts` | Aggregates all command descriptors into `commandDescriptors[]` | — |
| `si.ts` | Placeholder for legacy `si` root command resolution | — |

## Design/Patterns

- Each command uses a fluent builder API: `cmd(name) → .alias() → .desc() → .argument() → .option() → .action()`.
- Action handlers are async functions that use client helpers (`getHostClient()`, `getMiddlewareClient()`), config singletons (`profileManager`, `sessionConfig`), and output helpers.
- Commands are conditionally included: `completionCommand` only on Linux, `developerToolsCommand` only in development mode.
- `sequence` and `instance` commands use helper modules for complex operations (pack/send/start, kill/restart).

## Integration Points

- All commands registered in `index.ts` and consumed by `bin/index.ts`.
- Use `@scramjet/api-client` for Hub API operations and `@scramjet/middleware-api-client` for Platform API.
- `@scramjet/client-utils` `ClientError` is used for typed error handling in `instance.ts`.

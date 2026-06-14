# @scramjet/config

## Responsibility

Provides Zod-backed configuration loading, validation, secret masking, and CLI option metadata for Scramjet Transform Hub tools. Also implements a **native Scramjet CLI Command Model** (`command-model.ts`) that replaces Commander with a fully typed, descriptor-driven command tree system — used by the `si` CLI.

## Design / Patterns

- **Layered configuration merging** (`loadConfig`): Sources are merged in strict priority order — defaults < config file < package.json section < dotenv < env vars < CLI values < overrides. Each higher-priority layer overwrites the previous unless both sides are plain objects, in which case a deep recursive merge is used.
- **Zod validation**: The merged config blob is validated against a caller-supplied Zod schema (`input.schema`). Errors are formatted as `path: message` lines via `formatZodError`.
- **Secret masking**: Options marked `secret: true` are replaced with `"********"` in the `publicConfig` output via deep clone + path-based replacement.
- **CLI parsing** (`parseCliOptions`): Wraps the `cac` library behind Scramjet's own `ConfigOptionDescriptor` interface. Coerces raw CLI values by declared type (`string`, `number`, `boolean`, `string[]`, `number[]`, `json`).
- **Config file support**: JSON, JSONC (via `jsonc-parser`), and YAML (via `yaml`) are supported. The extension determines the parser.
- **Alias resolution** (`applyAliases`): Dot-path aliases are applied after merge but before validation; old paths are deleted after the value is moved.
- **Command Model** (`command-model.ts`):
  - **Descriptor-driven**: Commands, options, arguments, and hooks are plain `CommandDescriptor` / `OptionDescriptor` / `ArgumentDescriptor` objects — no class hierarchy.
  - **Builder pattern**: `cmd()` + `CommandBuilder` provides a fluent API (`.option()`, `.argument()`, `.action()`, `.children()`) that mirrors Commander's ergonomics without its dependency.
  - **Tree resolution**: `resolveCommandPath` walks argv left-to-right matching command names/aliases against the descriptor tree. Stops at first non-matching token.
  - **Manual option parsing**: `parseCommandContext` handles `--flag=value`, `--flag value`, `--no-flag`, boolean flags, choice validation, custom `parse` functions, and positional argument mapping — all without Commander.
  - **Lifecycle hooks**: `preAction` / `postAction` hooks on any command descriptor, executed around `action`.
  - **Help generation**: `generateHelp` produces usage text from descriptors (arguments, options, subcommands).

## Data & Control Flow

### Config loading (`loadConfig`)
```
defaults → readConfigFile → package.json section → dotenv → env vars → CLI → overrides
    ↓
applyAliases (dot-path renames)
    ↓
Zod schema.parse() → { config: T, publicConfig: maskConfig(config) }
```

### CLI command execution (`runCommandTree`)
```
argv → resolveCommandPath (walk descriptor tree)
    ↓
parseCommandContext (options + positional args → CommandContext)
    ↓
--help → generateHelp + return
--version → print version + return
    ↓
executeCommand → preAction → action(args, options) → postAction
```

## Integration Points

- **No internal Scramjet dependencies** — the package is self-contained, depending only on `cac`, `jsonc-parser`, `yaml`, and `zod`.
- Exports `{ z }` (re-exported Zod) so callers can build schemas without a separate zod import.
- `ConfigOptionDescriptor` is the shared option metadata type consumed by `packages/sth` (the main `si` CLI) for both option registration and env-var/CLI mapping.
- The `command-model` module (`cmd`, `CommandBuilder`, `runCommandTree`) is the foundation for the `si` CLI's entire command tree in `packages/sth`. The `CommandDescriptor`/`OptionDescriptor` types form the public API surface for all STH subcommands.
- `parseCliOptions` is used by the runner package for runtime option parsing; `loadConfig` is used by STH and other host processes to load unified configuration.

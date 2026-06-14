# packages/config/src/

## Files

### `index.ts` (365 lines, single entry point)

The main configuration module. Exports everything including the command model.

**Exported types:**
- `ConfigPath` — `string | readonly string[]` for dot-path references
- `CliOptionType` — one of `"string" | "number" | "boolean" | "string[]" | "number[]" | "json"`
- `ConfigOptionDescriptor` — full option metadata (name, flag, path, description, type, short, aliases, choices, parse, env, secret, multiple, negatable, defaultValue)
- `RuntimeOptionRegistry` — interface for registering options at runtime
- `ParseCliOptionsInput` — input shape for `parseCliOptions`
- `LoadConfigInput<T>` — all sources for `loadConfig` (schema, defaults, configFilePath, packageJsonPath, dotenv, env, cli, overrides, options, aliases)
- `LoadedConfig<T>` — result: `{ config: T, publicConfig: unknown }`

**Key functions:**

| Function | Purpose |
|---|---|
| `createOptionRegistry()` | Factory for `DefaultRuntimeOptionRegistry` |
| `parseCliOptions()` | Parse CLI argv through `cac`, coerce by type, return `Record<string, unknown>` |
| `loadConfig<T>() | Layered load: defaults → file → package.json → dotenv → env → cli → overrides, validate with Zod |
| `readConfigFile(path)` | Read JSON/JSONC/YAML file, return parsed object |
| `mergeConfig(target, source)` | Deep recursive merge (plain objects merge, arrays replace, primitives overwrite) |
| `maskConfig(value, options)` | Deep clone; replace `secret` option values with mask string |
| `formatZodError(error)` | Format `ZodError` as `path: message` lines |

**Internal helper functions:** `mergeAll`, `readPackageJsonSection`, `readDotEnvFile`, `envToConfig`, `cliToConfig`, `applyAliases`, `coerceEnv`, `toPath`, `normalizeOptionKey`, `setPath`, `getPath`, `deletePath`, `cloneValue`, `isPlainObject`, `formatFlags`, `optionConfig`, `coerceCliValue`, `coerceValue`.

### `command-model.ts` (622 lines)

Native Scramjet CLI Command Model — replaces Commander with descriptors + a small runner.

**Exported types:**
- `CompleterParams` — `string[] | "filenames" | "dirnames"` for shell completion metadata
- `OptionDescriptor` — subset of `ConfigOptionDescriptor` (no `env`, `flagAliases`, etc.; adds `required`, `completerKey`)
- `ArgumentDescriptor` — name, description, required, default, choices, parse
- `CommandAction` — `(...args) => Promise<void> | void`
- `CommandHooks` — `{ preAction?, postAction? }`
- `CommandContext` — resolved command + parsed options + positional args + raw tokens
- `CommandDescriptor` — full command tree node (name, alias, description, hidden, usage, arguments, options, hooks, completerMeta, children, action, metadata)
- `ResolveResult` — output of `resolveCommandPath`: leaf command, full path, consumed tokens, remainder

**Key functions / classes:**

| Export | Purpose |
|---|---|
| `resolveCommandPath(argv, root)` | Walk argv matching names/aliases; returns leaf command + path + remainder |
| `parseCommandContext(resolve, globalOptions?)` | Parse remainder into options + positional args; returns `CommandContext` |
| `executeCommand(ctx)` | Run `preAction` → `action` → `postAction` |
| `generateHelp(descriptor)` | Format help text from descriptor |
| `runCommandTree(root, argv, globalOptions?)` | Top-level: resolve → parse → handle --help/--version → execute |
| `cmd(name, build?)` | Create descriptor via `CommandBuilder` callback |
| `CommandBuilder` class | Fluent builder: `.alias()`, `.desc()`, `.hidden()`, `.usage()`, `.option()`, `.argument()`, `.meta()`, `.completer()`, `.action()`, `.preAction()`, `.postAction()`, `.children()`, `.command()`, `.addCommand()`, `.build()` |
| `opt(name, desc?, type?)` | Shorthand option descriptor factory |
| `arg(name, desc?, required?)` | Shorthand argument descriptor factory |

**Internal helpers:** `optionTokens`, `coerceOptionValue`, `parseOptionDescriptor`, `parseArgumentDescriptor`, `toCamelCase`, `coerceArgValue`, `validateChoice`.

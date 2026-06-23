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

### `verser2-config.ts` (190 lines)

Zod validation schemas and CLI option descriptor arrays for verser2 transport configuration across Manager and STH outbound modes.

**Schemas:**
- `managerVerser2ConfigSchema` — Zod schema for Manager/MultiManager verser2 Host configuration: host binding (identityDir, bindHost/bindPort, publicUrl, TLS), registration (token, allowed fingerprints), local broker/guest peer identities, timeouts, and leases.
- `sthOutboundVerser2ConfigSchema` — Zod schema for STH outbound verser2 client configuration: hostUrl, runnerHost sub-config (host binding, TLS, registration, local broker peer identity), broker/guest peer identities, TLS/ca/enrollment, timeouts, and leases. Includes `superRefine` validation for PEM pair pairing, mTLS constraints, and required-field checks when enabled.

**Option descriptors:**
- `managerVerser2Options` — 23 `ConfigOptionDescriptor` entries mapping `verser2.*` paths to CLI flags (`--verser2-*`), env vars (`SCRAMJET_VERSER2_*`), types, and secret masking markers.
- `sthOutboundVerser2Options` — 34 `ConfigOptionDescriptor` entries for STH outbound verser2 config, including runnerHost sub-options, TLS, enrollment, and a `verser2RunnerHostBrokerPeerId` flag that documents the `"auto"` identity derivation mode (resolves to `sth.<hostId>.runner.broker`).

**Design:** Schemas use `strict()` to reject unknown fields. PEM pair validation (`validatePemPair`) ensures cert and key are provided together. `validateRequiredRoutes` ensures critical fields are non-empty when verser2 is enabled. The `"auto"` runner broker peerId semantic is documented in the flag description rather than validated in the schema.

**Integration:**
- Both schema and option arrays are exported and consumed by `packages/sth-config` (ConfigService masking via `maskConfig()`), `packages/sth/src/bin/hub.ts` (CLI wiring + `loadConfig` validation), and `packages/manager` (Manager config loading).

# packages/config/src/

## Files

### `index.ts` (437 lines, package barrel + generic config loader)

The main configuration module. Defines and exports the generic configuration loader/CLI option helpers, then re-exports the command model, verser2 schemas, STH config surface, Manager config surface, and shared helpers.

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
| `formatZodError(error)` | Format `ZodError` as `path: message` lines |

**Internal helper functions:** `mergeAll`, `readPackageJsonSection`, `readDotEnvFile`, `envToConfig`, `cliToConfig`, `applyAliases`, `coerceEnv`, `toPath`, `normalizeOptionKey`, `setPath`, `getPath`, `deletePath`, `isPlainObject`, `formatFlags`, `optionConfig`, `coerceCliValue`, `coerceValue`.

**Canonical config re-exports:** STH defaults/services/public masking/runtime adapter/trust bootstrap from `sth/*.ts`, Manager defaults/services from `manager/*.ts`, `development` from `env.ts`, and `maskConfig` from `mask-config.ts`.

### `mask-config.ts` (37 lines)

Shared secret-masking helper extracted outside `index.ts` so STH public config code can mask secrets without importing through the package root.

**Key function:** `maskConfig(value, options, mask?)` deep-clones config values and replaces paths marked with `secret: true` in option descriptors with the mask string.

**Internal helper:** `cloneValue` recursively clones arrays and plain objects before path replacement.

### `env.ts` (1 line)

Exports the shared `development` environment flag used by legacy-compatible config surfaces.

### `sth/` config files

Canonical replacement surface for the removed `@scramjet/sth-config` package.

| File | Purpose |
|---|---|
| `default-config.ts` | STH default configuration object, including runner, API, Docker, storage, and verser2 defaults. |
| `config-service.ts` | `ConfigService` facade and `defaultConfig` export for STH config loading/masking compatibility. |
| `public-config.ts` | `toPublicSTHConfig()` masking/public projection using `maskConfig` source-relatively. |
| `runtime-adapter-option.ts` | `getRuntimeAdapterOption()` helper for selecting process/docker runtime adapter option values. |
| `manager-trust-bootstrap.ts` | Trust bootstrap material application helpers for Manager/STH connection config. |
| `image-config.ts` | Runtime image metadata export. |

### `manager/` config files

Canonical replacement surface for the removed `@scramjet/manager-config` package.

| File | Purpose |
|---|---|
| `default-config.ts` | Manager/MultiManager default configuration object, including API, hosts, Docker, and verser2 defaults. |
| `config-service.ts` | `ManagerConfigService`, singleton `managerConfigService`, and `getDefaultManagerConfig()` exports. |

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
- Both schema and option arrays are exported and consumed by `packages/config` (ConfigService masking via `maskConfig()`), `packages/sth/src/bin/hub.ts` (CLI wiring + `loadConfig` validation), and `packages/manager` (Manager config loading).

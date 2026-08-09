# packages/cli/src/lib/config/

## Responsibility

Configuration management for the Scramjet CLI (`si`). Provides profile-based configuration with global config (`SiConfig`), per-profile settings (`ProfileConfig`, `ReadOnlyProfileConfig`), session state (`SessionConfig`), and profile switching (`ProfileManager`).

## Modules

| File | Role |
|------|------|
| `index.ts` | Aggregates and initializes config. `initConfig()` resolves profile from `--config-path`, `--config`, env vars, or default. Exports `profileManager`, `siConfig`, `sessionConfig` singletons. |
| `siConfig.ts` | `SiConfig` — global CLI config (profile name), persisted as JSON. Extends `ConfigFileDefault`. |
| `sessionConfig.ts` | `SessionConfig` — runtime session state (last sequence ID, last instance ID, last package path, last hub ID, last space ID). |
| `profileConfig.ts` | `ProfileConfig` — mutable per-profile config (API base URL, API key, format, etc.). Extends `ConfigFileDefault` with validation. |
| `readOnlyProfileConfig.ts` | `ReadOnlyProfileConfig` — read-only per-profile config wrapper. |
| `commonProfileConfig.ts` | `commonProfileConfig` — default profile configuration values. |
| `profileManager.ts` | `ProfileManager` — singleton managing profile lifecycle: create, switch, list, validate, and restore defaults. Supports CLI flag and env var overrides. |

## Design/Patterns

- **Singleton pattern**: `ProfileManager` and `SiConfig` use `getInstance()` for application-wide access.
- **Fluent profile resolution**: `initConfig()` resolves profile from CLI args → env vars → current profile → default, with validation and fallback.
- **Config file abstraction**: `ConfigFileDefault` from `@scramjet/utility` provides JSON file read/write with entry validation.
- **Dash-ID aliases**: `getSequenceId()`, `getInstanceId()`, `getPackagePath()` resolve `-` to the last-used value from session config.

## Integration Points

- Used by all command modules via `import { profileManager, sessionConfig } from "../config"`.
- Initialized during CLI startup in `bin/index.ts`.
- `SessionConfig` tracks command history for `-` alias convenience.

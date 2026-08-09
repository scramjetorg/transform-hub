# packages/cli/src/bin/

## Responsibility

CLI entrypoint for the `si` command-line tool. Handles DNS configuration, path/config initialization, command tree construction, argument resolution, version/help display, and error handling.

## Modules

### `index.ts` — Main CLI entrypoint (81 lines)

1. Sets DNS resolution order to `ipv4first` (Node.js `setDefaultResultOrder`).
2. Initializes paths via `initPaths()` and config via `initConfig()`.
3. Builds root `si` command descriptor with global options (`--config`, `--config-path`, `--progress`).
4. Registers all child command descriptors from `lib/commands/index.ts`.
5. Handles `--version`/`-v` flag to display package version.
6. Resolves command path via `resolveCommandPath()` and executes the matched command.
7. On help request, displays current profile and generated help text with docs link.
8. Delegates errors to `errorHandler`.

## Integration Points

- Imports all command descriptors from `lib/commands/`.
- Uses `@scramjet/config` for command parsing, argument resolution, and help generation.
- Uses `initConfig()` from `lib/config/` for profile and config initialization.
- Uses `initPaths()` from `lib/paths/` for filesystem path setup.

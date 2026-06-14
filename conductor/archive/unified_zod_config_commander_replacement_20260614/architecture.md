# @scramjet/config Architecture

## Decisions

- Package name: `@scramjet/config` in `packages/config`.
- Validation and inference: Zod is the canonical schema layer.
- Schema metadata model: option metadata lives beside Zod schemas in Scramjet-owned descriptors. This keeps Zod schemas portable while allowing CLI/env/file metadata, masking, and compatibility aliases to evolve without overloading Zod internals.
- Defaults: defaults are represented as explicit default objects and merged as the first source. Zod defaults may be used for leaf-level convenience, but source precedence is owned by the loader.
- CLI parser: `cac` is the internal parser for migrated Scramjet CLIs. Parser types must not appear in public APIs.
- Config file loader: focused custom loader using existing JSON/YAML behavior plus JSONC support through `jsonc-parser` when available. This avoids adopting `c12` implicit discovery behavior before compatibility is proven.
- Package.json config section: supported as an explicit source when a `packageJsonPath` and section name are passed. It is not implicitly discovered.

## Precedence

Configuration sources are merged in this exact order:

```text
defaults < config file < package.json config section < .env < process.env < CLI < explicit runtime overrides
```

Values are applied only when they are not `undefined`, so `false`, `0`, and `""` remain valid overrides. Arrays replace previous arrays by default. Object values are deep-merged. Unknown keys are rejected by default through strict Zod object schemas, with an explicit pass-through option for intentionally open config sections such as adapter-specific config and application config.

## Public APIs

- `createOptionRegistry()` collects Scramjet-owned CLI option descriptors and replaces public `commander.Command` adapter augmentation.
- `parseCliOptions()` parses descriptors with the internal parser and returns plain option values.
- `loadConfig()` merges declared sources, applies compatibility aliases, validates with Zod, and returns typed config plus masked public output helpers.
- `loadConfig()` accepts explicit runtime overrides as the highest-precedence source during a load operation; live runtime reconfiguration is outside this package's current scope.
- `maskConfig()` applies descriptor metadata to redact secrets in public config output.
- `formatZodError()` returns operator-readable validation errors.

## Native CLI Command Model

The CLI migration must be a full replacement, not a wrapper around Commander. `@scramjet/config` should expose Scramjet-owned command descriptors and a small command runner that maps the existing `si command subcommand --arg` style onto a native command tree.

Required model:

- A command is a descriptor with `name`, optional `alias`, optional `description`, optional `hidden`, `arguments`, `options`, hooks, event/completion metadata, child commands, and an async action.
- A command path is resolved by walking positional tokens from left to right, preserving the existing style such as `si config profile use default`, `si sequence send`, and `si instance input --content-type text/plain`.
- Options are parsed only after the command path is resolved, using the command's local options plus inherited global options where enabled.
- Arguments are consumed positionally according to command descriptors, including required and optional arguments and choices.
- Completion and developer documentation read the Scramjet command tree directly rather than inspecting parser internals.
- Help/version output is generated from descriptors. It does not need to reproduce Commander byte-for-byte, but command names, aliases, public options, argument names, and action behavior must remain compatible.

Forbidden model:

- Do not re-export Commander classes from `@scramjet/config`.
- Do not create local classes named like Commander drop-in replacements (`Command`, `Option`, `Argument`) whose purpose is to preserve the old fluent Commander API.
- Do not keep `packages/cli` on a Commander compatibility layer.

## Adapter Option Flow

1. STH registers common options in a `RuntimeOptionRegistry`.
2. STH parses only the common runtime-adapter option to select `detect`, `process`, `docker`, or `kubernetes`.
3. The selected adapter or detected adapter set registers adapter-specific options into the registry.
4. STH parses final CLI values from the registry.
5. Parsed values are mapped into existing STH config keys and validated/merged by the config foundation.

## Compatibility

- Existing CLI flags remain stable, including `--no-docker`, `--runner-image`, `--runner-py-image`, `--runner-bun-image`, Kubernetes `--k8s-*` options, and MultiManager `--healtz-*` spellings.
- Existing config shapes remain accepted during migration.
- Compatibility aliases are resolved before validation and recorded in migration notes.
- Secret metadata covers platform API keys, CouchDB password, S3 keys, S3 bucket, S3 endpoint, S3 region, and certificate paths in public-safe output.

## Verser2 Extension Points

The config package supports adding future nested sections, aliases, and secret metadata without changing the loader. This track intentionally does not add concrete verser2 Host endpoint or TLS fields; `verser2_rollout_20260613` can add those descriptors later.

## Full Commander Removal Scope

- `@scramjet/cli` command tree migration is in scope for this track so direct Commander imports can be removed fully from package code.
- CLI completion and developer-tool behavior must be migrated to Scramjet-owned command descriptors rather than Commander internals.
- If a parser implementation is needed, it must remain hidden behind `@scramjet/config` internals and must not leak into public APIs.
- Removal of `@scramjet/sth-config`, `@scramjet/manager-config`, and legacy utility config classes is deferred until migrated behavior has parity coverage.

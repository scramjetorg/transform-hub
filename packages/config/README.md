# @scramjet/config

Zod-backed configuration foundation for Scramjet Transform Hub packages.

The package owns configuration descriptors, source precedence, validation, CLI option parsing metadata, compatibility aliases, and public-safe masking. Parser implementation details are kept internal so package APIs do not expose third-party CLI parser types.

It also provides a native Scramjet command descriptor model for CLI command trees. Commands are declared with Scramjet-owned descriptors and executed by resolving `command subcommand --option` token paths without exposing parser implementation types.

## Source Precedence

```text
defaults < config file < package.json config section < .env < process.env < CLI < explicit runtime overrides
```

Object values are deep-merged, arrays replace earlier arrays, and only `undefined` is ignored. Valid falsy values such as `false`, `0`, and `""` are preserved.

## Runtime Overrides

`loadConfig()` accepts explicit runtime overrides as the highest-precedence source. These overrides are applied during a config load operation and are intended for callers that already have in-process values they need to layer above files, env, and CLI values.

This package does not provide live runtime reconfiguration, file watchers, or automatic mutation of already-loaded config objects. Consumers that need runtime changes must call `loadConfig()` again with a new override set or own their own reload/update lifecycle.

## CLI Command Model

The native command model supports:

- nested command descriptors with names, aliases, descriptions, arguments, options, hooks, completion metadata, and async actions;
- interleaved positional arguments and options, such as `si sequence start id --config-file config.json`;
- negated boolean options, such as `--no-color`;
- completion metadata generated from descriptors instead of parser internals.

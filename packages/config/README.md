# @scramjet/config

Zod-backed configuration foundation for Scramjet Transform Hub packages.

The package owns configuration descriptors, source precedence, validation, CLI option parsing metadata, compatibility aliases, and public-safe masking. Parser implementation details are kept internal so package APIs do not expose third-party CLI parser types.

It also provides a native Scramjet command descriptor model for CLI command trees. Commands are declared with Scramjet-owned descriptors and executed by resolving `command subcommand --option` token paths without exposing parser implementation types.

## Source Precedence

```text
defaults < config file < package.json config section < .env < process.env < CLI < explicit runtime overrides
```

Object values are deep-merged, arrays replace earlier arrays, and only `undefined` is ignored. Valid falsy values such as `false`, `0`, and `""` are preserved.

## CLI Command Model

The native command model supports:

- nested command descriptors with names, aliases, descriptions, arguments, options, hooks, completion metadata, and async actions;
- interleaved positional arguments and options, such as `si sequence start id --config-file config.json`;
- negated boolean options, such as `--no-color`;
- completion metadata generated from descriptors instead of parser internals.

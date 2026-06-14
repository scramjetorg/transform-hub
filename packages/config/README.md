# @scramjet/config

Zod-backed configuration foundation for Scramjet Transform Hub packages.

The package owns configuration descriptors, source precedence, validation, CLI option parsing metadata, compatibility aliases, and public-safe masking. Parser implementation details are kept internal so package APIs do not expose third-party CLI parser types.

## Source Precedence

```text
defaults < config file < package.json config section < .env < process.env < CLI < explicit runtime overrides
```

Object values are deep-merged, arrays replace earlier arrays, and only `undefined` is ignored. Valid falsy values such as `false`, `0`, and `""` are preserved.

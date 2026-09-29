---
id: examples-native-template-bun
slug: /examples/native-template-bun
title: Native Bun sequence template
---

# Native Bun sequence template

`templates/sequences/bun` is a dependency-free Bun sequence starter. Its CommonJS entrypoint is `index.js`, and its example output is `native-template-bun: hello world`.

## Local verification

From the template directory, run:

```sh
bun test
```

The template has no runtime dependencies. If you add Bun dependencies, install them before packaging; the CLI does not install Node or Bun dependencies.

## Scaffold, package, and deploy

Create a copy in a new project directory with:

```sh
si scaffold sequence bun --path ./my-sequence
cd ./my-sequence
bun test
si sequence pack .
si sequence deploy .
```

The final command uploads the package and starts the sequence using the configured Hub.

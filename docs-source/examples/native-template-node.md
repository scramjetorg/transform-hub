---
id: examples-native-template-node
slug: /examples/native-template-node
title: Native Node sequence template
---

# Native Node sequence template

`templates/sequences/node` is a dependency-free Node sequence starter. Its entrypoint is `index.js`, and its example output is `native-template-node: hello world`.

## Local verification

From the template directory, run:

```sh
node --test
```

The template has no runtime dependencies. If you add Node dependencies, install them before packaging; the CLI does not install Node or Bun dependencies.

## Scaffold, package, and deploy

Create a copy in a new project directory with:

```sh
si scaffold sequence node --path ./my-sequence
cd ./my-sequence
node --test
si sequence pack .
si sequence deploy .
```

The final command uploads the package and starts the sequence using the configured Hub.
